import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
        const origin = new URL(endpoint).origin;
        const s3 = new S3Client({
            endpoint: origin, region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey
            },
            forcePathStyle: true
        });

        getSignedUrl(
            s3, 
            new PutObjectCommand({
                Bucket: bucket,
                Key: fileName,
                ContentType: 'text/csv'
            }),
            { expiresIn: 600 }
        ).then(url => {
            const u = url.replace(origin, endpoint);
            fetch(u, {
                method: 'PUT',
                body: csv
            })
            .then(resolve)
            .catch(reject);
        }).catch(reject);
    });
}