import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ModelService } from './model.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ModelService],
})
export class AppModule { }
