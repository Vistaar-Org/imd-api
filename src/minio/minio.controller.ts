import { Controller, Post, Get, Delete, Param, Body, UploadedFile, UseInterceptors, Res, HttpException, HttpStatus } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MinIOService } from "./minio.service";
import { Response } from "express";

@Controller('minio')
export class MinIOController {
  constructor(private readonly minioService: MinIOService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Body('bucket') bucket: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new HttpException('File is missing', HttpStatus.BAD_REQUEST);
    }
    await this.minioService.uploadFile(bucket, file.originalname, file.buffer, file.mimetype);
    return { message: 'File uploaded successfully' };
  }

  @Get('download/:bucket/:filename')
  async getFile(
    @Param('bucket') bucket: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    try {
      const fileBuffer = await this.minioService.getFile(bucket, filename);
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(fileBuffer);
    } catch (error) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Creates a new bucket in MinIO.
   * @param bucketName - Name of the bucket to create.
   */
  @Post('bucket/create')
  async createBucket(@Body('bucketName') bucketName: string) {
    if (!bucketName) {
      throw new HttpException('Bucket name is required', HttpStatus.BAD_REQUEST);
    }
    await this.minioService.createBucket(bucketName);
    return { message: `Bucket ${bucketName} created successfully` };
  }

  /**
   * Lists all buckets in MinIO.
   */
  @Get('buckets')
  async listBuckets() {
    const buckets = await this.minioService.listBuckets();
    return { buckets };
  }

  /**
   * Deletes a bucket in MinIO.
   * @param bucketName - Name of the bucket to delete.
   */
  @Delete('bucket/delete/:bucketName')
  async deleteBucket(@Param('bucketName') bucketName: string) {
    if (!bucketName) {
      throw new HttpException('Bucket name is required', HttpStatus.BAD_REQUEST);
    }
    await this.minioService.deleteBucket(bucketName);
    return { message: `Bucket ${bucketName} deleted successfully` };
  }
}