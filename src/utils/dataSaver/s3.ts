import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function save_s3(opts: {
    csv: string,
    accessKey: string,
    secretKey: string,
    bucket: string,
    endpoint: string,
    signEndpoint?: string,
    region: string,
    fileName: string
}) {
    return new Promise((resolve, reject) => {
        const { csv, accessKey, secretKey, bucket, signEndpoint, endpoint, region, fileName } = opts;
        const s3 = new S3Client({
            endpoint: signEndpoint ? signEndpoint : endpoint, region,
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
            const u = url.replace(signEndpoint ? signEndpoint : endpoint, endpoint);
            fetch(u, {
                method: 'PUT',
                body: csv
            })
            .then(resolve)
            .catch(reject);
        }).catch(reject);
    });
}