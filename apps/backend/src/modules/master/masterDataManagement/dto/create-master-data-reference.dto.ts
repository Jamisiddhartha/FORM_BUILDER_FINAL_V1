import { IsString } from 'class-validator';

export class CreateMasterDataReferenceDto {
  @IsString()
  fromDataId: string;

  @IsString()
  toDataId: string;

  @IsString()
  columnKey: string;
}
