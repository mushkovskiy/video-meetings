export const Component = {
  RestApplication: Symbol.for('RestApplication'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  DatabaseClient: Symbol.for('DatabaseClient'),
  AppExceptionFilter: Symbol.for('AppExceptionFilter'),
  UserService: Symbol.for('UserService'),
  UserModel: Symbol.for('UserModel'),
  UserController: Symbol.for('UserController'),
  MeetingService: Symbol.for('MeetingService'),
  MeetingModel: Symbol.for('MeetingModel'),
  MeetingController: Symbol.for('MeetingController'),
} as const;
