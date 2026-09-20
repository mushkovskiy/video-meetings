import type { ReturnModelType } from '@typegoose/typegoose';
import { Container } from 'inversify';

import { Component } from '../../types/component.type.js';
import { DefaultMeetingService } from './default-meeting.service.js';
import type { MeetingService } from './meeting-service.interface.js';
import { MeetingController } from './meeting.controller.js';
import type { MeetingEntity } from './meeting.entity.js';
import { MeetingModel } from './meeting.entity.js';

export const createMeetingContainer = (): Container => {
  const container = new Container();

  container
    .bind<MeetingService>(Component.MeetingService)
    .to(DefaultMeetingService)
    .inSingletonScope();
  container
    .bind<ReturnModelType<typeof MeetingEntity>>(Component.MeetingModel)
    .toConstantValue(MeetingModel);
  container
    .bind<MeetingController>(Component.MeetingController)
    .to(MeetingController)
    .inSingletonScope();

  return container;
};
