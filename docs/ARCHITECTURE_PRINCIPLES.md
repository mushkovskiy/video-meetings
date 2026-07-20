# Архитектурные принципы и технологический стек (REST)

> Документ-эталон для агента, строящего архитектуру нового приложения.
> Извлечён из REST API проекта «Шесть городов» (Node.js / TypeScript).
> Описывает **как принято проектировать и организовывать код в этой кодовой базе**,
> чтобы новое приложение можно было построить в том же стиле.

---

## 1. Технологический стек

### Runtime и язык

- **Node.js** `^18` (ESM-модули, `"type": "module"` в `package.json`).
- **TypeScript** `5.2` со строгим режимом. Ключевые опции `tsconfig`:
  - `target: ES2022`, `module: NodeNext`, `moduleResolution: node16`.
  - `strict: true`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
  - `experimentalDecorators` + `emitDecoratorMetadata` (нужно для DI и валидации).
  - `importHelpers` (`tslib`), `sourceMap`, вывод в `./dist`.
- Импорты в исходниках указываются с расширением **`.js`** (требование NodeNext ESM), несмотря на то что файлы `.ts`.

### Ключевые библиотеки

| Назначение                  | Библиотека                                             |
| --------------------------- | ------------------------------------------------------ |
| HTTP-фреймворк              | `express` 4                                            |
| Async-обёртка роутов        | `express-async-handler`                                |
| Внедрение зависимостей (DI) | `inversify` + `reflect-metadata`                       |
| ODM для MongoDB             | `mongoose` 7 + `@typegoose/typegoose`                  |
| Валидация DTO               | `class-validator` + `class-transformer`                |
| Конфигурация из ENV         | `convict` + `convict-format-with-validator` + `dotenv` |
| JWT                         | `jose`                                                 |
| Логирование                 | `pino` (+ `pino-pretty` для dev)                       |
| HTTP-статусы                | `http-status-codes`                                    |
| Загрузка файлов             | `multer`, `mime-types`                                 |
| Работа с датами             | `dayjs`                                                |

### Инструментарий

- **ESLint** (`eslint-config-htmlacademy`, `@typescript-eslint`, `@stylistic`) — линт `src/ --ext .ts`.
- **nodemon** + `ts-node` — dev-режим.
- **rimraf** — очистка `dist`.
- Сборка: `clean` → `tsc` → запуск скомпилированного JS из `dist/`.
- CI: GitHub Actions (`.github/workflows/check.yml`).

---

## 2. Верхнеуровневая структура приложения

Точка входа REST-сервера собирает DI-контейнер, всё остальное — в переиспользуемом ядре `shared`:

```
src/
├── main.rest.ts        # точка входа REST-сервера (bootstrap DI-контейнера)
├── rest/               # слой REST-приложения (Express)
│   ├── rest.application.ts   # оркестратор инициализации сервера
│   ├── rest.container.ts     # DI-контейнер уровня приложения
│   └── rest.constant.ts
└── shared/             # переиспользуемое ядро
    ├── modules/        # бизнес-модули (user, offer, comment)
    ├── libs/           # инфраструктурные библиотеки
    ├── helpers/        # чистые функции-утилиты
    └── types/          # общие типы, enum'ы, DI-токены
```

**Принцип:** тонкая точка входа (`main.rest.ts`) только собирает DI-контейнер и запускает приложение. Вся логика — в `shared`, переиспользуемых модулях и библиотеках.

---

## 3. Внедрение зависимостей (Inversify)

DI — **центральный архитектурный приём**. Соблюдать неукоснительно.

### Токены компонентов

Все зависимости регистрируются под токенами-символами в одном месте — `shared/types/component.type.ts`:

```ts
export const Component = {
  RestApplication: Symbol.for('RestApplication'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  DatabaseClient: Symbol.for('DatabaseClient'),
  OfferService: Symbol.for('OfferService'),
  OfferModel: Symbol.for('OfferModel'),
  OfferController: Symbol.for('OfferController'),
  // ...
} as const;
```

### Контейнеры по модулям + merge

Каждый модуль экспортирует **фабрику своего контейнера** (`create<Module>Container()`), а `main.rest.ts` объединяет их через `Container.merge(...)`:

```ts
const appContainer = Container.merge(
  createRestApplicationContainer(),
  createUserContainer(),
  createOfferContainer(),
  createCommentContainer(),
  createAuthContainer(),
);
const application = appContainer.get<RestApplication>(Component.RestApplication);
await application.init();
```

Пример модульного контейнера:

```ts
export const createOfferContainer = () => {
  const container = new Container();
  container.bind<OfferService>(Component.OfferService).to(DefaultOfferService).inSingletonScope();
  container.bind<types.ModelType<OfferEntity>>(Component.OfferModel).toConstantValue(OfferModel);
  container.bind<OfferController>(Component.OfferController).to(OfferController).inSingletonScope();
  return container;
};
```

### Правила DI

- Классы, участвующие в DI, помечаются `@injectable()`.
- Зависимости — через конструктор с `@inject(Component.X)`, поля `private readonly`.
- Сервисы, контроллеры, инфраструктура регистрируются `inSingletonScope()`.
- Mongoose/Typegoose-модели биндятся как `toConstantValue(Model)`.
- Программируем **на интерфейс, а не на реализацию**: биндинг `Component.OfferService → DefaultOfferService`, потребители зависят от интерфейса `OfferService`.

---

## 4. Организация бизнес-модуля

Каждый модуль в `shared/modules/<name>/` следует единому шаблону файлов:

```
offer/
├── offer.entity.ts              # Typegoose-класс + экспорт модели
├── offer-service.interface.ts   # контракт сервиса
├── default-offer.service.ts     # реализация сервиса (работа с моделью)
├── offer.controller.ts          # HTTP-контроллер (роуты + хендлеры)
├── offer.container.ts           # DI-фабрика модуля
├── dto/                         # входные DTO (валидация class-validator)
│   ├── create-offer.dto.ts
│   └── update-offer.dto.ts
├── rdo/                         # выходные RDO (форма ответа, class-transformer)
│   └── offer-rdo.ts
├── types/                       # типы параметров/запросов роутов
└── helpers/                     # локальные утилиты модуля
```

**Слоистость строго соблюдается:**

```
Controller → Service (интерфейс) → Entity/Model (Typegoose) → MongoDB
```

- **Controller** — только HTTP: разбор запроса, вызов сервиса, проверки прав/наличия, формирование ответа через RDO. Бизнес-правил в БД не пишет.
- **Service** — вся работа с данными и бизнес-логика; принимает/возвращает DTO/DocumentType.
- **Entity** — описание схемы документа (Typegoose), никакой логики приложения.
- **DTO ≠ RDO ≠ Entity** — три разных типа для трёх границ (вход / выход / хранение).

---

## 5. Слой контроллеров (REST)

### Базовый абстрактный контроллер

Все контроллеры наследуют `BaseController` (`shared/libs/rest/base-controller.abstract.ts`), который даёт:

- инкапсулированный `express.Router`;
- метод `addRoute({ path, method, handler, middlewares })` — оборачивает хендлер и middleware в `express-async-handler` и биндит `this`;
- унифицированные ответы: `ok()`, `created()`, `noContent()`, `send()`;
- проход ответа через `PathTransformer` (преобразование путей к файлам в абсолютные URL).

### Паттерн контроллера

```ts
@injectable()
export class OfferController extends BaseController {
  constructor(
    @inject(Component.Logger) protected readonly logger: Logger,
    @inject(Component.OfferService) private readonly offerService: OfferService,
    // ...
  ) {
    super(logger);
    this.addRoute({ path: '/', method: HttpMethod.Get, handler: this.index });
    this.addRoute({
      path: '/:offerId',
      method: HttpMethod.Patch,
      handler: this.updateById,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new ValidateDtoMiddleware(UpdateOfferDto),
      ],
    });
  }

  public updateById = async (req, res): Promise<void> => {
    /* ... */
  };
}
```

**Правила контроллеров:**

- Роуты регистрируются в конструкторе через `addRoute`.
- Хендлеры — **стрелочные поля класса** (сохранение `this`), сигнатура `(req, res) => Promise<void>`.
- Валидация, авторизация, проверка ObjectId — через **middleware**, а не внутри хендлера.
- Ошибки — через `throw new HttpError(StatusCode, message, source)` (не `res.status().json()` вручную).
- Ответ формируется через `fillDTO(SomeRdo, data)` — наружу отдаётся только RDO.
- Приложение подключает контроллеры по префиксам: `/users`, `/offers`, `/comments`.

---

## 6. Middleware (переиспользуемые)

Единый интерфейс `Middleware` с методом `execute(req, res, next)`. Реализации в `shared/libs/middleware/`:

| Middleware                          | Ответственность                                                       |
| ----------------------------------- | --------------------------------------------------------------------- |
| `ParseTokenMiddleware`              | глобальный разбор JWT → `req.tokenPayload`                            |
| `PrivateRouteMiddleware`            | требует аутентификацию (иначе `401`)                                  |
| `ValidateDtoMiddleware(Dto)`        | `plainToInstance` + `class-validator`, при ошибке → `ValidationError` |
| `ValidateObjectIdMiddleware(param)` | проверка валидности Mongo ObjectId                                    |
| `UploadFileMiddleware(dir, field)`  | загрузка файлов через `multer`                                        |

**Принцип:** middleware конфигурируются параметрами конструктора и переиспользуются на любом роуте.

---

## 7. Валидация и формирование ответов

- **Вход (DTO):** классы с декораторами `class-validator` (`@MinLength`, `@IsEnum`, `@IsMongoId`, `@ValidateNested` + `@Type` для вложенных объектов). Каждое правило снабжается человекочитаемым `message`.
- **Выход (RDO):** классы с `@Expose()` (`class-transformer`); `fillDTO(RDO, source)` отдаёт наружу только явно раскрытые поля — защита от утечки полей документа.
- Граница «внешний мир → приложение» всегда проходит через DTO-валидацию; «приложение → клиент» — через RDO.

---

## 8. Слой данных (Typegoose / MongoDB)

- Сущности — классы с `@modelOptions({ schemaOptions: { collection, timestamps } })` и полями-`@prop()`.
- Наследование `defaultClasses.TimeStamps` для `createdAt/updatedAt`.
- Связи — через `Ref<Entity>` и `@prop({ ref: Entity })`; выборки используют `.populate([...])`.
- Модель экспортируется через `getModelForClass(Entity)` и биндится в DI как `toConstantValue`.
- Сервис инкапсулирует все запросы: `find/create/updateById/deleteById`, `$inc`/`$push`/`$set`, агрегации (`aggregate` с `$lookup`, `$addFields`, `$project`).
- Подключение к БД — через абстракцию `DatabaseClient` (интерфейс `connect/disconnect`), реализация `MongoDatabaseClient`. URI собирается хелпером `getMongoURI(...)`.

---

## 9. Конфигурация (convict)

- Схема ENV описана декларативно в `shared/libs/config/rest.schema.ts`: для каждой переменной — `doc`, `format`, `env`, `default`.
- Типобезопасность: `RestSchema` — TS-тип, `Config<RestSchema>` внедряется через DI (`Component.Config`).
- Значения читаются только через `config.get('KEY')`; прямого доступа к `process.env` в коде нет.
- Секреты и параметры БД (`SALT`, `JWT_SECRET`, `DB_*`, `PORT`, `UPLOAD_DIRECTORY`) — исключительно из ENV.

---

## 10. Логирование и обработка ошибок

### Логирование

- Абстракция `Logger` (интерфейс `info/warn/error/debug`), реализация `PinoLogger` (`pino`, файл + stdout).
- Логгер внедряется через DI во все сервисы/контроллеры. `console.*` в бизнес-коде не используется.

### Обработка ошибок — цепочка Exception Filters

Реализуют интерфейс `ExceptionFilter` (`catch(error, req, res, next)`), регистрируются в конце middleware-цепочки **в порядке специфичности**:

```ts
this.server.use(authExceptionFilter.catch.bind(...));        // ошибки аутентификации
this.server.use(validationExceptionFilter.catch.bind(...));  // ошибки валидации DTO
this.server.use(appExceptionFilter.catch.bind(...));         // общий фильтр (HttpError / прочее)
```

- `HttpError` несёт `httpStatusCode`, `message`, `detail` (источник).
- Типизированные доменные исключения (`UserNotFoundException`, `UserPasswordIncorrectException`) наследуют базовое исключение.
- Ответ об ошибке приводится к единому виду через `createErrorObject(...)`.

---

## 11. Аутентификация / авторизация

- **JWT** через `jose`: `SignJWT` с алгоритмом и сроком из констант, подпись `crypto.createSecretKey(JWT_SECRET)`.
- Payload токена типизирован (`TokenPayload`: `email, firstName, lastName, id`).
- `ParseTokenMiddleware` глобально кладёт payload в `req.tokenPayload`; `PrivateRouteMiddleware` защищает приватные роуты.
- Пароли: хеш с солью (`SALT` из ENV), проверка через метод сущности `verifyPassword`.
- Авторизация на ресурс (владелец) проверяется в контроллере: сравнение `offer.userId` с `tokenPayload.id`, иначе `403`.

---

## 12. Соглашения об именовании

| Сущность            | Шаблон имени файла                | Пример                       |
| ------------------- | --------------------------------- | ---------------------------- |
| Интерфейс сервиса   | `<name>-service.interface.ts`     | `offer-service.interface.ts` |
| Реализация сервиса  | `default-<name>.service.ts`       | `default-offer.service.ts`   |
| Контроллер          | `<name>.controller.ts`            | `offer.controller.ts`        |
| Сущность/модель     | `<name>.entity.ts`                | `offer.entity.ts`            |
| DI-контейнер модуля | `<name>.container.ts`             | `offer.container.ts`         |
| Входной DTO         | `<action>-<name>.dto.ts`          | `create-offer.dto.ts`        |
| Выходной RDO        | `<name>-rdo.ts` / `<name>.rdo.ts` | `offer-rdo.ts`               |
| Middleware          | `<name>.middleware.ts`            | `validate-dto.middleware.ts` |
| Enum                | `<name>.enum.ts`                  | `http-method.enum.ts`        |

- Классы — `PascalCase`, файлы — `kebab-case` с суффиксом роли.
- Интерфейс описывает контракт, реализация — с префиксом `Default`.
- Директории модулей — единственное число (`offer`, `user`, `comment`).

---

## 13. Чек-лист для нового модуля

При добавлении бизнес-сущности `X` в новом приложении, следуй порядку:

1. `types/component.type.ts` — добавить токены `XService`, `XModel`, `XController`.
2. `x.entity.ts` — Typegoose-класс + `getModelForClass`.
3. `x-service.interface.ts` — контракт сервиса.
4. `default-x.service.ts` — реализация (`@injectable`, `@inject` модели и логгера).
5. `dto/*.dto.ts` — входные DTO с `class-validator`.
6. `rdo/*.rdo.ts` — выходные RDO с `@Expose`.
7. `x.controller.ts` — наследник `BaseController`, роуты с middleware.
8. `x.container.ts` — `createXContainer()` с биндингами.
9. `main.rest.ts` — включить `createXContainer()` в `Container.merge(...)`.
10. `rest.application.ts` — подключить `xController.router` по префиксу.

---

## 14. Сводка ключевых принципов

1. **DI везде** (Inversify + токены-символы + модульные контейнеры через merge).
2. **Programming to interfaces** — потребители зависят от интерфейсов, реализации `Default*`.
3. **Чёткая слоистость**: Controller → Service → Entity, без «протечек» слоёв.
4. **Три модели данных**: DTO (вход) / RDO (выход) / Entity (хранение) — не смешивать.
5. **Тонкие точки входа**, вся логика — в переиспользуемом `shared`.
6. **Единый REST-каркас**: `BaseController`, `addRoute`, конфигурируемые middleware, цепочка exception-фильтров.
7. **Типобезопасная конфигурация** из ENV через convict; никакого прямого `process.env`.
8. **Абстрагированная инфраструктура**: `Logger`, `DatabaseClient`, `ExceptionFilter` — интерфейсы + внедряемые реализации.
9. **Строгий TypeScript** + ESLint как часть контракта качества.
10. **Модульность по фиче**: всё, что относится к сущности, лежит в одной директории по единому шаблону файлов.
