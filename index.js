import AWS from 'aws-sdk'
import fetch from 'node-fetch';
const s3 = new AWS.S3();
const s3Bucket = 'demobucketsahithi'
export async function handler(event) {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message)
    const { submissionUrl, userEmail } = snsMessage;
    const s3Key = `documents/${userEmail}/example.txt`;
    try {
        const response = await fetch(submissionUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        await uploadToS3(s3Bucket, s3Key, fileBuffer);
        console.log('File fetched and uploaded to S3 successfully.');
    }
    catch(ex){
        console.log(ex)
    }
}

async function uploadToS3(bucket, key, data) {
    await s3
        .putObject({
            Bucket: bucket,
            Key: key,
            Body: data,
        })
        .promise();
}
