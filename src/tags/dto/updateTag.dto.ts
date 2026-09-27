import { PartialType } from '@nestjs/mapped-types';
import { CreateTagDto } from './createTag.dto.js';

export class UpdateTagDto extends PartialType(CreateTagDto) { }