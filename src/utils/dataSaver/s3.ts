import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function save_s3(opts: {
    csv: string,
    accessKey: string,
    secretKey: string,
    bucket: string,
    endpoint: string,
    region: string,
    fileName: string
}) {
    return new Promise((resolve, reject) => {
        const { csv, accessKey, secretKey, bucket, endpoint, region, fileName } = opts;
        const s3 = new S3Client({
            endpoint, region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey
            },
            forcePathStyle: true
        });

        s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: fileName,
                Body: csv
            })
        )
        .then(() => resolve)
        .catch(reject);
    });
}