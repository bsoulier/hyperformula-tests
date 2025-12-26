import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ModelService } from './model.service';

@Controller('api')
export class AppController {
  constructor(private readonly modelService: ModelService) { }

  @Get('model')
  getModel() {
    return this.modelService.getAllValues();
  }

  @Get('formula')
  getFormula(@Query('col') col: string, @Query('row') row: string) {
    return { formula: this.modelService.getFormula(Number(col), Number(row)) };
  }

  @Post('model/cell')
  updateCell(@Body() body: { col: number; row: number; input: string }) {
    return this.modelService.updateCell(body.col, body.row, body.input);
  }
  @Get('model/names')
  getNames() {
    return this.modelService.getRegisteredNames();
  }
}
