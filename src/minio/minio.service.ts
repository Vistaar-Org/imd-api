import { Injectable, Logger, InternalServerErrorException, ConflictException, NotFoundException } from "@nestjs/common";
import { Client as MinioClient } from "minio";
import { Readable } from "stream";

@Injectable()
export class MinIOService {
  private readonly logger = new Logger(MinIOService.name);

  constructor(private readonly minioClient: MinioClient) {}

  /**
   * Uploads a file to a specified bucket in MinIO.
   * @param bucketName - Name of the bucket.
   * @param objectName - Name of the object/file.
   * @param fileBuffer - Buffer of the file to upload.
   * @param contentType - MIME type of the file.
   */
  async uploadFile(
    bucketName: string,
    objectName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    try {
      // Ensure the bucket exists
      await this.ensureBucketExists(bucketName);

      // Upload the file
      await this.minioClient.putObject(bucketName, objectName, fileBuffer, fileBuffer.length, {
        "Content-Type": contentType,
      });
      this.logger.log(`File ${objectName} uploaded to bucket ${bucketName}.`);
    } catch (error) {
      this.logger.error(`Failed to upload file ${objectName} to bucket ${bucketName}: ${error.message}`);
      throw new InternalServerErrorException("File upload failed.");
    }
  }

  /**
   * Fetches a file from a specified bucket in MinIO.
   * @param bucketName - Name of the bucket.
   * @param objectName - Name of the object/file.
   * @returns Buffer of the fetched file.
   */
  async getFile(bucketName: string, objectName: string): Promise<Buffer> {
    try {
      const stream: Readable = await this.minioClient.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];

      return await new Promise<Buffer>((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", (err) => {
          this.logger.error(`Error fetching file ${objectName} from bucket ${bucketName}: ${err.message}`);
          reject(new InternalServerErrorException("File fetch failed."));
        });
      });
    } catch (error) {
      this.logger.error(`Failed to get file ${objectName} from bucket ${bucketName}: ${error.message}`);
      throw new InternalServerErrorException("File retrieval failed.");
    }
  }

  /**
   * Creates a new bucket in MinIO.
   * @param bucketName - Name of the bucket to create.
   */
  async createBucket(bucketName: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (exists) {
        this.logger.warn(`Bucket ${bucketName} already exists.`);
        throw new ConflictException(`Bucket ${bucketName} already exists.`);
      }

      await this.minioClient.makeBucket(bucketName, "us-east-1");
      this.logger.log(`Bucket ${bucketName} created successfully.`);
    } catch (error) {
      this.logger.error(`Failed to create bucket ${bucketName}: ${error.message}`);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException("Bucket creation failed.");
    }
  }

  /**
   * Ensures that a bucket exists; if not, creates it.
   * @param bucketName - Name of the bucket to ensure.
   */
  async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(bucketName, "us-east-1");
        this.logger.log(`Bucket ${bucketName} created.`);
      } else {
        this.logger.log(`Bucket ${bucketName} already exists.`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket ${bucketName} exists: ${error.message}`);
      throw new InternalServerErrorException("Bucket verification failed.");
    }
  }

  /**
   * Lists all buckets in MinIO.
   * @returns Array of bucket names.
   */
  async listBuckets(): Promise<string[]> {
    try {
      const buckets = await this.minioClient.listBuckets();
      return buckets.map(bucket => bucket.name);
    } catch (error) {
      this.logger.error(`Failed to list buckets: ${error.message}`);
      throw new InternalServerErrorException("Failed to retrieve bucket list.");
    }
  }

  /**
   * Deletes a bucket in MinIO.
   * @param bucketName - Name of the bucket to delete.
   */
  async deleteBucket(bucketName: string): Promise<void> {
    try {
      const objects = await this.minioClient.listObjectsV2(bucketName, "", true);
      // Delete all objects in the bucket first
      const deletePromises = [];
      for await (const obj of objects) {
        deletePromises.push(this.minioClient.removeObject(bucketName, obj.name));
      }
      await Promise.all(deletePromises);
      // Now delete the bucket
      await this.minioClient.removeBucket(bucketName);
      this.logger.log(`Bucket ${bucketName} deleted successfully.`);
    } catch (error) {
      this.logger.error(`Failed to delete bucket ${bucketName}: ${error.message}`);
      throw new InternalServerErrorException("Bucket deletion failed.");
    }
  }
} 