# Research: техническая реализация загрузки записи встречи и транскрипции

**PRD:** prd-meeting-file-upload-and-processing.md
**План:** plan-prd-meeting-file-upload-and-processing.md
**Дата:** 2026-10-03

Цель документа — для каждой фазы плана выбрать оптимальное техническое решение с учётом текущего кода (`apps/backend`, `apps/frontend`), `docs/ARCHITECTURE_PRINCIPLES.md` и актуального состояния библиотек на дату исследования.

## TL;DR — ключевые решения

| Вопрос                           | Решение                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Приём multipart                  | `multer` **обновить до `^2.4.0`** (сейчас `1.4.5-lts.1` с двумя High CVE), `diskStorage`, `upload.single('file')`, `limits: { fileSize, files: 1 }` |
| Где проверять доступ             | **До** multer: `PrivateRoute → ValidateObjectId → MeetingOwner → UploadFile`, иначе 100 МБ пишутся на диск для чужой встречи                        |
| Хранение файла                   | `UPLOAD_DIRECTORY/recordings/<meetingId>/<recordingId>.<ext>`, имя генерирует сервер, оригинальное имя — только в БД                                |
| Модель данных                    | Отдельная коллекция `recordings` (модуль `recording`), уникальный индекс на `meetingId`, транскрипт в том же документе                              |
| Защита от «поздней» транскрипции | Условный апдейт `updateOne({ _id: recordingId, status: 'processing' }, …)`; при замене создаётся новый `_id`                                        |
| Фоновая обработка                | In-process очередь с concurrency = 1 за интерфейсом `TranscriptionQueue`; восстановление `processing`-записей при старте. Без Redis/BullMQ          |
| Декодирование                    | `ffmpeg-static` + `child_process.spawn` → `-f f32le -ac 1 -ar 16000` в stdout → `Float32Array`. **Не** `fluent-ffmpeg` (deprecated)                 |
| Модель                           | `@huggingface/transformers@^4.3`, `automatic-speech-recognition`, по умолчанию `Xenova/whisper-small`, `language: 'russian'`, `chunk_length_s: 30`  |
| Тесты                            | Фейковые `TranscriptionService` через `container.rebind`, `@huggingface/transformers` импортируется лениво (`await import`)                         |
| Прогресс загрузки                | `XMLHttpRequest` + `upload.onprogress` (у `fetch` нет прогресса отправки)                                                                           |
| Прокси Next.js                   | Rewrites `/api/*` оставить; поднять `experimental.proxyTimeout` (дефолт 30 с)                                                                       |
| Актуализация статуса             | Polling `GET .../recording` раз в 3 с, пауза на скрытой вкладке; SSE/WebSocket не нужны                                                             |

---

## 1. Исходное состояние кода (что влияет на решения)

- **Backend:** Express 4, Inversify, Typegoose/Mongoose 7, `multer@1.4.5-lts.1` и `mime-types` уже в зависимостях, но не используются. `UPLOAD_DIRECTORY` уже есть в `rest.schema.ts` и `.env.example`. Модуль `meeting` проверяет владельца в хендлере `show` (`meeting.ownerId !== tokenPayload.id → 403`).
- **`RestApplication.getServer()`** — seam для supertest, `init()` вызывается только в реальном запуске. Это удобно для фоновых задач: восстановление очереди можно повесить на `init()`, и тесты его не затронут.
- **`tests/helpers/create-test-app.ts`** возвращает только `Express`, контейнер наружу не отдаётся — для подмены сервиса транскрипции его придётся расширить (см. §5.4).
- **Frontend:** Next.js 16.2, всё клиентское (токен в `localStorage`), запросы идут через rewrite `/api/:path* → http://localhost:4000/:path*` в `next.config.ts`. Хелпер `request()` в `lib/api.ts` жёстко ставит `Content-Type: application/json` — для `FormData` его использовать нельзя.
- **Окружение:** Windows, Node 24, системного `ffmpeg` нет.

---

## 2. Фаза 1 — загрузка и хранение (backend)

### 2.1 Multer: обновление обязательно

Установленная `multer@1.4.5-lts.1` уязвима:

- **CVE-2025-47935** (CVSS 7.5) — утечка памяти/дескрипторов при ошибке потока запроса.
- **CVE-2025-47944** (CVSS 7.5) — падение процесса на некорректном multipart-запросе.

Обе исправлены в 2.0.0, рекомендация Express-команды — обновиться. Дополнительно в 2.3.0 закрыт обход `limits.fileSize` при **асинхронном** `fileFilter`. Актуальная версия — `2.4.0`; работает с Express 4.

```bash
pnpm add multer@^2.4.0 --filter backend
```

`fileFilter` делаем **синхронным** (только проверка расширения/MIME) — это и проще, и вне зоны той уязвимости.

### 2.2 `UploadFileMiddleware`

В §6 архитектурного документа он уже предусмотрен: `UploadFileMiddleware(dir, field)` в `shared/libs/middleware/`. Предлагаемая сигнатура расширена лимитами:

```ts
new UploadFileMiddleware({
  directory: (req) => path.join(uploadDir, 'recordings', req.params.meetingId),
  fieldName: 'file',
  maxFileSize: MAX_RECORDING_SIZE, // 100 * 1024 * 1024
  allowedExtensions: ['.mp3', '.wav', '.m4a', '.mp4', '.webm'],
});
```

Внутри:

- `multer.diskStorage` с `destination`, создающим каталог (`fs.mkdir(..., { recursive: true })`), и `filename = ${new ObjectId()}${ext}` — **никогда** не использовать `originalname` в пути (path traversal, коллизии, кириллица).
- `limits: { fileSize: maxFileSize, files: 1, fields: 5 }`.
- Маппинг ошибок в `HttpError`, чтобы их корректно отрисовал `AppExceptionFilter`:
  - `MulterError('LIMIT_FILE_SIZE')` → `413 Payload Too Large` («Файл больше 100 МБ»);
  - `LIMIT_UNEXPECTED_FILE` / `LIMIT_FILE_COUNT` → `400`;
  - отказ `fileFilter` → `400` («Неподдерживаемый формат. Допустимы: mp3, wav, m4a, mp4, webm»);
  - файла нет в запросе → `400`.
- При ошибке multer сам удаляет частично записанный файл (`storage._removeFile`), дополнительная уборка не нужна.
- **Кириллица в имени файла.** busboy по умолчанию декодирует параметр `filename` как `latin1`, поэтому «Встреча.mp3» превратится в кракозябры. Решение: опция `defParamCharset: 'utf8'` при создании multer (или `Buffer.from(file.originalname, 'latin1').toString('utf8')`). Обязательно покрыть e2e-тестом.

### 2.3 Валидация формата

Браузеры отдают разный `Content-Type` для одних и тех же форматов (m4a: `audio/mp4`, `audio/x-m4a`; wav: `audio/wav`, `audio/x-wav`, `audio/wave`; webm может быть `audio/webm` или `video/webm`; Windows иногда шлёт `application/octet-stream`). Поэтому:

- **Основной критерий — расширение** (`path.extname(originalname).toLowerCase()`) по allowlist.
- **MIME — вторичный**: допускаем `audio/*`, `video/mp4`, `video/webm`, `application/octet-stream`; явно чужие (`application/pdf`, `image/*`) отклоняем.
- Проверку «магических байтов» (`file-type`) в этой итерации **не делать**: реальное содержимое всё равно проверит ffmpeg в фазе 3, а битый файл уйдёт в статус `failed` с понятным сообщением. Это укладывается в PRD («Ошибка → можно загрузить заново»).

### 2.4 Проверка доступа до записи на диск

Express выполняет middleware по порядку, а multer начинает писать файл сразу. Если проверить владельца в хендлере (как сейчас в `show`), чужой пользователь сможет залить 100 МБ, и файл придётся удалять. Порядок для `POST /meetings/:meetingId/recording`:

```
PrivateRouteMiddleware          → 401
ValidateObjectIdMiddleware      → 400
MeetingOwnerMiddleware          → 404 / 403   (новый, принимает MeetingService)
UploadFileMiddleware            → 413 / 400
handler
```

`MeetingOwnerMiddleware(meetingService, paramName)` — конфигурируемый параметрами конструктора, как требует §6; кладёт найденную встречу в `res.locals.meeting`, чтобы хендлер не делал повторный запрос. Его же используют `GET .../recording` и рефакторинг `GET /meetings/:id` (по желанию). Это небольшое отклонение от §11 («владелец проверяется в контроллере») — его нужно отразить в `apps/backend/CLAUDE.md`.

Нюанс 401/403 до чтения тела: если сервер отвечает ошибкой, не дочитав multipart-тело, клиент может получить `EPIPE`/`ECONNRESET` вместо ответа (известное поведение supertest и браузеров на больших телах). Для маленьких тестовых файлов это не проявляется; для фронтенда клиентская валидация размера закрывает основной кейс.

### 2.5 Модель данных: отдельная коллекция `recordings`

Варианты:

| Вариант                                                  | Плюсы                                                                                                       | Минусы                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Поддокумент `recording` в `MeetingEntity`                | Одна выборка                                                                                                | `GET /meetings` (список) тянет все транскрипты, нужна проекция; бизнес-логика записи размазывается по модулю `meeting` |
| **Отдельная коллекция `recordings`, модуль `recording`** | Чистое разделение по §4; список встреч не трогается; уникальный индекс гарантирует «одна запись на встречу» | Второй запрос в `GET .../recording` (встреча + запись)                                                                 |

Рекомендуется второй. Размер транскрипта не проблема: 1,5 ч речи ≈ 12–15 тыс. слов ≈ 100–200 КБ, лимит документа 16 МБ.

```ts
// shared/modules/recording/recording.entity.ts
export enum RecordingStatus {
  Processing = 'processing',
  Done = 'done',
  Failed = 'failed',
}

@modelOptions({ schemaOptions: { collection: 'recordings', timestamps: true } })
@index({ meetingId: 1 }, { unique: true })
export class RecordingEntity extends defaultClasses.TimeStamps {
  @prop({ required: true, type: () => String }) public meetingId!: string;
  @prop({ required: true, type: () => String }) public ownerId!: string;
  @prop({ required: true, type: () => String }) public originalName!: string;
  @prop({ required: true, type: () => String }) public storedName!: string; // относительный путь
  @prop({ required: true, type: () => String }) public mimeType!: string;
  @prop({ required: true, type: () => Number }) public size!: number;
  @prop({ required: true, enum: RecordingStatus, type: () => String })
  public status!: RecordingStatus;
  @prop({ type: () => String }) public transcript?: string;
  @prop({ type: () => String }) public failureReason?: string; // текст для пользователя
}
```

Замечания:

- `type: () => …` явно на каждом `@prop` — требование из `apps/backend/CLAUDE.md` (tsx/esbuild не эмитит `design:type`).
- «Дата загрузки» = `createdAt`. При замене создаётся **новый документ** (новый `_id` и `createdAt`), а не обновляется старый — это нужно для защиты от поздних результатов (§6).
- Статус «Загружается» существует только на клиенте; на сервере — `processing` / `done` / `failed`.
- В БД хранить **относительный** путь (`recordings/<meetingId>/<id>.mp3`), абсолютный собирать из `UPLOAD_DIRECTORY` — переносимость между окружениями.
- Mongoose 7 строит индексы через `autoIndex` при первом обращении к модели; в тестах на `mongodb-memory-server` уникальный индекс появится сам. Для надёжности можно вызвать `RecordingModel.syncIndexes()` при старте.

### 2.6 RDO

`RecordingRdo`: `id`, `originalName`, `size`, `mimeType`, `status`, `uploadedAt` (`createdAt`), `transcript` (только при `done`), `failureReason` (только при `failed`). Путь к файлу наружу не отдаётся — `fillDTO` с `@Expose()` это гарантирует.

### 2.7 Тесты фазы 1

- **Изоляция диска:** в `beforeAll` каждого файла — `process.env.UPLOAD_DIRECTORY = await fs.mkdtemp(path.join(os.tmpdir(), 'vm-uploads-'))`, в `afterAll` — `fs.rm(..., { recursive: true, force: true })`. Как и с Mongo, `RestConfig` перечитывает env через `restSchema.load({})`.
- **Фикстуры:** закоммитить в `tests/fixtures/` по одному крошечному реальному файлу каждого формата (1 с тишины, единицы КБ). В фазе 1 содержимое не важно, но в фазе 3 они понадобятся для опционального smoke-теста декодера.
- **`413` без 100 МБ в памяти.** Отправлять 100 МБ+1 байт через supertest медленно и нестабильно (сервер обрывает соединение, клиент ловит `EPIPE`). Рекомендация: вынести лимит в конфиг `UPLOAD_MAX_RECORDING_SIZE` (default `104857600`), в тестах выставлять, например, 1 КБ и слать 2 КБ. Поведение при этом идентично, критерий PRD («сервер возвращает 413») проверен. Если лимит должен оставаться константой — генерировать буфер `Buffer.alloc(MAX + 1)` и ловить либо `413`, либо `ECONNRESET` (хуже).
- Кириллическое имя файла сохраняется корректно.
- После успешной загрузки файл реально лежит в temp-`UPLOAD_DIRECTORY`.

---

## 3. Фаза 2 — страница встречи и загрузка (frontend)

### 3.1 Маршрут и данные

- `src/app/meetings/[meetingId]/page.tsx` — клиентский компонент (`'use client'`), так как токен лежит в `localStorage`; `meetingId` брать через `useParams()` (в Next 16 `params` серверного компонента — `Promise`, в клиентском проще `useParams`).
- Доступ к странице — существующий `useRequireSession`.
- В `lib/api.ts` добавить `getMeeting(token, id)`, `getRecording(token, meetingId)` (404 → `null`, а не ошибка) и отдельную функцию загрузки на XHR (см. ниже).
- `MeetingListItem` обернуть в `next/link` на `/meetings/${meeting.id}`.
- Логику вынести в хуки по сложившемуся паттерну (`hooks/use-meeting.ts`, `hooks/use-recording.ts`, `hooks/use-recording-upload.ts`), форматирование — в `lib/` (`formatFileSize` и т. п.).

### 3.2 Прогресс загрузки: XHR, не fetch

`fetch` не умеет сообщать прогресс **отправки** тела (streaming request body в Chrome есть, но без событий прогресса и только для HTTP/2+). Стандартное решение — `XMLHttpRequest`:

```ts
export function uploadRecording(
  token: string,
  meetingId: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<Recording> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/meetings/${meetingId}/recording`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      /* 2xx → resolve(JSON), иначе reject(new ApiError(message, xhr.status)) */
    };
    xhr.onerror = () => reject(new ApiError('Сеть недоступна', 0));
    signal?.addEventListener('abort', () => xhr.abort());
    const body = new FormData();
    body.append('file', file);
    xhr.send(body); // Content-Type с boundary проставит браузер
  });
}
```

Парсинг тела ошибки (`detail` / `message`) переиспользовать из `resolveErrorMessage` — вынести общую часть, чтобы сообщения 400/413/403 были одинаковыми с остальным API.

### 3.3 Прокси через Next.js rewrites

- `experimental.proxyClientMaxBodySize` (10 МБ по умолчанию, обрезает тело **молча**) применяется **только когда в проекте есть `proxy.ts`** (бывший `middleware.ts`). Сейчас его нет — ограничение не действует. **Если `proxy.ts` появится в будущем, загрузка 100 МБ сломается без явной ошибки** — это стоит записать в `apps/frontend/CLAUDE.md`.
- Rewrites на внешний хост имеют таймаут прокси 30 с (`experimental.proxyTimeout`). На localhost 100 МБ уходят за секунды, но на медленной сети — нет. Рекомендуется выставить, например, `proxyTimeout: 10 * 60 * 1000`.
- Альтернатива (загрузка напрямую на `:4000` с CORS) не нужна: усложняет конфиг и ломает единый `/api`-префикс.

### 3.4 Клиентская валидация

- Те же правила, что на сервере: расширение по allowlist + `file.size <= 100 * 1024 * 1024`. «100 МБ» трактовать как MiB (104 857 600 байт) **на обеих сторонах**, иначе файл 100,5 «десятичных» МБ пройдёт клиент и упадёт на сервере.
- Общего пакета между приложениями нет, заводить ради двух констант не стоит — продублировать в `lib/recording.ts` с комментарием-ссылкой на бэкенд.
- `<input type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/mp4,video/webm">` — только подсказка ОС-диалогу, не валидация (пользователь может выбрать «Все файлы»).
- UI-компоненты: проверить в skill `heroui-react` наличие `ProgressBar` и диалога подтверждения (для фазы 6) в HeroUI v3, прежде чем писать свои.

### 3.5 Playwright

- Файлы — через `page.setInputFiles(selector, { name, mimeType, buffer })`, без фикстур на диске.
- Для «настоящей» загрузки нужен запущенный бэкенд с БД; для детерминированных сценариев (ошибки 413/403, статусы) — `page.route('**/api/meetings/*/recording', …)`. Рекомендуется: один happy-path против реального API, остальные — с моками.

---

## 4. Фаза 3 — асинхронная транскрипция (backend)

### 4.1 Транскрипция: Transformers.js в Node

- Пакет: `@huggingface/transformers@^4.3.0` (актуальная v4). В Node использует `onnxruntime-node` (нативный бинарник, есть сборки под Windows/Linux/macOS) и тянет `sharp` (уже есть в `allowBuilds`).
- API: `pipeline('automatic-speech-recognition', model, { dtype, device: 'cpu' })`, вызов `transcriber(float32Array, { language: 'russian', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 })`.
- **На вход — только `Float32Array` 16 кГц моно.** `read_audio` библиотеки опирается на Web Audio API (`AudioContext`), которого в Node нет; официальный Node-гайд декодирует WAV пакетом `wavefile`. Для mp3/m4a/mp4/webm нужен ffmpeg (§4.2).
- `chunk_length_s: 30` обязательно: без него Whisper обрабатывает только первые 30 с. Pipeline сам режет на окна с перекрытием `stride_length_s` и склеивает текст.

**Выбор модели** (через конфиг `TRANSCRIPTION_MODEL`):

| Модель                                  | Размер    | Русский             | CPU                    |
| --------------------------------------- | --------- | ------------------- | ---------------------- |
| `Xenova/whisper-tiny`, `whisper-base`   | 39M / 74M | слабо (высокий WER) | быстро                 |
| **`Xenova/whisper-small`**              | 244M      | приемлемо           | ~реалтайм и медленнее  |
| `onnx-community/whisper-large-v3-turbo` | 809M      | хорошо              | очень медленно, ГБ RAM |

Рекомендация по умолчанию — `whisper-small` (квантованный `q8`): компромисс качества русского и скорости для pet-проекта. `whisper-base` удобен для локальной отладки. Язык задавать явно (`TRANSCRIPTION_LANGUAGE=russian`): автоопределение на первых 30 с иногда ошибается и тратит время.

Известная особенность Whisper — «галлюцинации» на тишине/музыке (повторяющиеся фразы, «Продолжение следует…»). Для этой итерации принимаем; при желании — постобработка схлопыванием повторов.

**Кэш модели:**

- `env.cacheDir = config.get('TRANSCRIPTION_CACHE_DIR')` (например `./.cache/models`, добавить в `.gitignore`).
- Pipeline создаётся **один раз** (ленивый singleton-промис в сервисе), повторная загрузка модели на каждую задачу недопустима.
- Первое скачивание — сотни МБ. Чтобы первая загрузка пользователя не висела долго в `processing`, прогревать модель в `RestApplication.init()` в фоне (не блокируя старт) и/или дать скрипт `pnpm --filter backend model:download`. В продакшене можно `env.allowRemoteModels = false` с заранее скачанной моделью.

### 4.2 Декодирование: ffmpeg-static + spawn

- Системного ffmpeg на машине нет → `ffmpeg-static@^5.3` (кладёт бинарник под текущую ОС в `node_modules`; скачивание в postinstall — добавить `ffmpeg-static: true` в `allowBuilds` в `pnpm-workspace.yaml`, аналогично `onnxruntime-node`). Путь к бинарнику — с возможностью переопределения `FFMPEG_PATH` в конфиге (для Docker с системным ffmpeg).
- **`fluent-ffmpeg` не использовать** — пакет помечен deprecated на npm. Нужна одна команда, обёртка не нужна:

```ts
const ff = spawn(ffmpegPath, [
  '-nostdin',
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  inputPath,
  '-vn', // отбросить видео (mp4/webm)
  '-ac',
  '1',
  '-ar',
  '16000',
  '-f',
  'f32le',
  'pipe:1',
]);
// stdout → Buffer-чанки → Float32Array; stderr собрать для failureReason/логов;
// exit code ≠ 0 → ошибка «Не удалось декодировать файл»
```

Видео и аудио обрабатываются одной командой (`-vn`). Файл без аудиодорожки → ffmpeg вернёт ошибку → `failed`.

- **Память.** 16 000 сэмплов × 4 байта = 64 КБ/с ≈ 230 МБ/час. Файл 100 МБ mp3 128 kbps ≈ 1 ч 45 мин ≈ 400 МБ `Float32Array` — терпимо, но на грани для небольшого сервера. Рекомендуемое улучшение: читать stdout **сегментами по ~10 мин** (≈ 38 МБ), транскрибировать сегмент, затем продолжать чтение (`stdout.pause()/resume()` — ffmpeg сам встанет на backpressure пайпа), тексты склеивать. Шов между сегментами может разрезать слово — для этой итерации допустимо; для MVP можно начать с декодирования целиком и перейти на сегменты, если упрёмся в память.
- Не держать декодированный файл на диске — пайп достаточен.

### 4.3 Фоновое выполнение

Транскрипция длится минуты–десятки минут и грузит CPU. Сравнение вариантов:

| Вариант                                                        | Оценка                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `void service.transcribe()` прямо в хендлере                   | Нет ограничения параллелизма: 3 загрузки = 3 модели в параллель → OOM/деградация. Задачи теряются при рестарте |
| **In-process очередь, concurrency 1, Mongo — источник правды** | Просто, без инфраструктуры; рестарт лечится повторной постановкой `processing`-записей при старте              |
| BullMQ / Redis                                                 | Надёжно, но новый сервис в docker-compose и зависимость ради одной фоновой задачи — overkill                   |
| Agenda / очередь в MongoDB                                     | Сохраняемость без Redis, но ещё одна библиотека с собственной моделью; для одного типа задач избыточно         |

**Рекомендация:** `TranscriptionQueue` (интерфейс + `DefaultTranscriptionQueue`, `Component.TranscriptionQueue`, singleton):

- `enqueue(recordingId)` — кладёт id в массив, если воркер свободен — запускает. Concurrency = 1.
- `cancel(recordingId)` — удаляет из очереди; для текущей задачи — `AbortController`, сигнал проверяется между сегментами и убивает процесс ffmpeg.
- `start()` — вызывается из `RestApplication.init()` (не из `getServer()`, чтобы тесты его не запускали): находит записи со статусом `processing` и ставит их в очередь. Так перезапуск сервера не оставляет «вечных» `processing`.
- Обработчик задачи: `decoder.decode(path)` → `transcriptionService.transcribe(samples)` → условный апдейт в `done`; любая ошибка → условный апдейт в `failed` + `logger.error` с причиной. Пользователю — нейтральный `failureReason` («Не удалось распознать запись»), технические детали — только в лог.
- Таймаут задачи (например, 3× длительность аудио, но не меньше N минут) — защита от зависшего процесса.

**Блокировка event loop.** `onnxruntime-node` выполняет инференс в нативных потоках, но извлечение log-mel признаков и цикл генерации токенов частично идут в JS-потоке. При concurrency 1 это короткие, но частые паузы для API. Для pet-проекта приемлемо; интерфейс `TranscriptionService` позволяет позже вынести реализацию в `worker_threads` или отдельный процесс без изменения остального кода. Сразу делать worker не рекомендуется: под `tsx watch` и после `tsc` путь к файлу воркера различается (`.ts`/`.js`), это лишняя сложность на старте.

### 4.4 Слои и DI

```
shared/libs/audio/      AudioDecoder (interface) + FfmpegAudioDecoder
shared/libs/transcription/
                        TranscriptionService (interface) + WhisperTranscriptionService
shared/modules/recording/
                        RecordingService, RecordingController, TranscriptionQueue, entity/DTO/RDO
```

Новые токены в `Component`: `RecordingService`, `RecordingModel`, `RecordingController`, `AudioDecoder`, `TranscriptionService`, `TranscriptionQueue`. Новые ключи конфига (в `rest.schema.ts` и `.env.example`): `UPLOAD_MAX_RECORDING_SIZE`, `TRANSCRIPTION_MODEL`, `TRANSCRIPTION_LANGUAGE`, `TRANSCRIPTION_CACHE_DIR`, `FFMPEG_PATH` (опционально). `process.env` нигде, кроме convict, не читается — `env.cacheDir` Transformers.js задаётся из `Config`.

### 4.5 Тесты фазы 3

- **`@huggingface/transformers` импортировать лениво** внутри `WhisperTranscriptionService` (`const { pipeline, env } = await import('@huggingface/transformers')`). Тогда Vitest при сборке контейнера не грузит нативный `onnxruntime-node` и не скачивает модель.
- `createTestApp` расширить: `createTestApp({ transcriptionService?, audioDecoder? })` → `container.rebind(Component.TranscriptionService).toConstantValue(fake)`. Фейк — управляемый промис (`resolve('текст')` / `reject(new Error())`), чтобы тест детерминированно проверял `processing → done` / `processing → failed`.
- Ожидание перехода статуса — поллинг `GET .../recording` в тесте с коротким интервалом (или `vi.waitFor`), без `sleep`.
- Поскольку `queue.start()` висит на `init()`, в тестах очередь стартует лениво при первом `enqueue` — проверить, что `enqueue` не требует `start()`.
- Опциональный smoke-тест реального ffmpeg-декодера на фикстурах из §2.7 (быстрый, без модели): проверяет, что все 5 форматов декодируются в непустой `Float32Array`. Реальную модель в CI не запускать.

---

## 5. Фаза 4 — статусы и транскрипт (frontend)

- **Polling, а не SSE/WebSocket.** Обработка длится минуты, задержка 3 с незаметна. SSE через Next rewrites подвержен буферизации прокси, WebSocket требует отдельной инфраструктуры на Express — оба не окупаются.
- Хук `useRecording` с `setTimeout`-циклом (не `setInterval`, чтобы запросы не накладывались): интервал 3 с, пока `status === 'processing'`; остановка на `done`/`failed`, на размонтировании и при смене `meetingId`; пауза при `document.visibilityState === 'hidden'` и немедленный запрос при возврате на вкладку. Сетевые ошибки опроса не должны сбрасывать отображённый статус — увеличить интервал (простой backoff) и продолжить.
- Транскрипт может быть длинным — рендерить как текст с `whitespace-pre-wrap` в прокручиваемом контейнере, без `dangerouslySetInnerHTML`.
- Playwright: `page.route` отвечает `processing` первые N запросов, затем `done` с текстом — проверяется появление текста без перезагрузки; аналогично `failed` + доступность повторной загрузки. `page.clock` позволяет не ждать реальные 3 с.

---

## 6. Фаза 5 — замена записи (backend)

Порядок операций в `RecordingService.replace(...)` (multer к этому моменту уже записал новый файл):

1. Создать **новый** документ записи (новый `_id`, `status: processing`) и атомарно вытеснить старый: `findOneAndReplace({ meetingId }, newDoc, { upsert: true, returnDocument: 'before' })` — уникальный индекс по `meetingId` гарантирует одну запись при гонке двух одновременных загрузок (вторая выиграет, первая станет «старой»). Новый `_id` нужно передать явно, т. к. `replace` сохраняет `_id` существующего документа; альтернатива — `deleteOne` + `create` с обработкой `E11000`.
2. Если запись в БД не удалась — удалить только что загруженный файл и пробросить ошибку (`500`).
3. `queue.cancel(oldId)` — снять старую задачу из очереди / прервать текущую.
4. Удалить старый файл с диска (`fs.rm(..., { force: true })`); ошибку удаления только логировать — данные пользователя уже консистентны.
5. `queue.enqueue(newId)`.

**Защита от «поздних» результатов** — главное требование фазы. Обработчик задачи сохраняет результат только условно:

```ts
await recordingModel.updateOne(
  { _id: recordingId, status: RecordingStatus.Processing },
  { $set: { status: RecordingStatus.Done, transcript } },
);
// matchedCount === 0 → запись заменена или удалена → результат молча отбрасывается (debug-лог)
```

Так как при замене меняется `_id`, старая задача физически не может перезаписать новую — даже если `cancel` не успел. Отдельное поле-версия (`uploadId`) не требуется.

Тест: фейковый сервис с ручным `resolve` — загрузить файл A, не завершая транскрипцию загрузить B, затем `resolve` для A → `GET` возвращает метаданные B, `status: processing`, без транскрипта A; файла A нет в temp-директории.

## 7. Фаза 6 — подтверждение замены (frontend)

- При существующей записи выбор файла сначала проходит клиентскую валидацию, затем открывает диалог подтверждения (HeroUI — уточнить через skill `heroui-react`); загрузка стартует только по «Заменить». При отмене — сбросить значение `<input type="file">` (`input.value = ''`), иначе повторный выбор того же файла не вызовет `change`.
- После подтверждения сразу локально скрыть старый транскрипт (оптимистично) и показать «Загружается»; при ошибке загрузки — перечитать `GET .../recording`, чтобы показать фактическое состояние.
- На время загрузки и в статусе `processing` кнопку замены можно оставить доступной (PRD это не запрещает), но блокировать повторный запуск во время активной XHR-загрузки.

---

## 8. Зависимости и конфигурация — сводка изменений

```bash
pnpm add multer@^2.4.0 @huggingface/transformers@^4.3.0 ffmpeg-static@^5.3.0 --filter backend
pnpm add -D @types/multer@latest --filter backend   # совместимые с multer 2 типы
```

- `pnpm-workspace.yaml` → `allowBuilds`: `ffmpeg-static: true`, `onnxruntime-node: true` (postinstall-скрипты; `sharp` уже разрешён).
- `.gitignore`: `apps/backend/uploads/`, кэш моделей.
- `apps/backend/.env.example`: новые ключи из §4.4.
- `apps/frontend/next.config.ts`: `experimental.proxyTimeout`.
- Обновления существующих версий (Express 5, Mongoose 9, Typegoose 13) **не требуются** для этой фичи и не должны в неё смешиваться.

## 9. Документация, которую нужно обновить по ходу

- `apps/backend/CLAUDE.md`: модуль `recording`, `MeetingOwnerMiddleware` (отклонение от §11 — проверка владельца до multer), `UploadFileMiddleware`, очередь транскрипции и её запуск в `init()`, ленивый импорт Transformers.js, подмена сервисов в `createTestApp`, temp-`UPLOAD_DIRECTORY` в тестах.
- `apps/frontend/CLAUDE.md`: XHR-загрузка, ограничение `proxyClientMaxBodySize` при появлении `proxy.ts`, `proxyTimeout`.
- `http/meetings-recording.http` (multipart-запрос в REST Client).

## 10. Риски

| Риск                                                                      | Митигация                                                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Долгая транскрипция на CPU (час аудио — десятки минут на `whisper-small`) | Concurrency 1, явный язык, выбор модели через конфиг, статус `processing` переживает перезагрузку страницы |
| Нехватка RAM на длинных файлах                                            | Сегментное декодирование (§4.2)                                                                            |
| Рестарт сервера посреди обработки                                         | Повторная постановка `processing` в `init()`                                                               |
| Первое скачивание модели                                                  | Прогрев в `init()` / скрипт предзагрузки                                                                   |
| Нативные бинарники (`onnxruntime-node`, `ffmpeg-static`) на разных ОС     | `allowBuilds`, `FFMPEG_PATH` для системного ffmpeg в Docker                                                |
| Тихое обрезание тела при появлении `proxy.ts`                             | Заметка в CLAUDE.md, e2e-тест загрузки через `/api`                                                        |
| Галлюцинации Whisper на тишине                                            | Принять в этой итерации                                                                                    |

## Источники

- [Express security releases 2025-05-19 (multer CVE-2025-47935, CVE-2025-47944)](https://expressjs.com/it/blog/2025-05-19-security-releases)
- [Multer: обход fileSize при асинхронном fileFilter, исправлено в 2.3.0](https://corgea.com/advisories/vulnerabilities/CVE-2026-77063)
- [Multer README (опции, `defParamCharset`)](https://expressjs.com/en/resources/middleware/multer)
- [multer issue #962 — кодировка originalname](https://github.com/expressjs/multer/issues/962)
- [Next.js `proxyClientMaxBodySize`](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize)
- [Next.js rewrites: socket hang up / `experimental.proxyTimeout`](https://lightrun.com/answers/vercel-next-js-nextconfigjs-rewrites-error-socket-hang-up)
- [Transformers.js: Server-side audio processing in Node.js](https://huggingface.co/docs/transformers.js/guides/node-audio-processing)
- [Transformers.js ASR pipeline (исходник v4)](https://app.unpkg.com/@huggingface/transformers@4.2.0/files/src/pipelines/automatic-speech-recognition.js)
- [Transformers.js ASR pipeline types](https://app.unpkg.com/@huggingface/transformers@4.2.0/files/types/pipelines/automatic-speech-recognition.d.ts)
- [Transformers.js `env` (cacheDir, allowRemoteModels)](https://huggingface.co/docs/transformers.js/main/en/api/env)
- [Transformers.js v4 release highlights](https://releases.sh/hugging-face/transformers-js/highlights)
- npm registry на 2026-10-03: `@huggingface/transformers@4.3.0` (deps: `onnxruntime-node@1.30.0`, `sharp`), `multer@2.4.0`, `ffmpeg-static@5.3.0`, `fluent-ffmpeg@2.1.3` (deprecated)
