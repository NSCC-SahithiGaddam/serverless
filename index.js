import AWS from 'aws-sdk'
import fetch from 'node-fetch';
import Mailgun from 'mailgun.js';
import formData from 'form-data'
const mailgun = new Mailgun(formData);
const s3 = new AWS.S3();
const s3Bucket = 'demobucketsahithi'
const mailgunApiKey = '1cbbf5398d1f07504fdce143074e1296-30b58138-110fb265';
const mailgunDomain = 'csyenscc.me';

AWS.config.update({region: 'us-west-1'});
var docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'demotable';

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
        await sendEmail(userEmail, 'Download Status', 'The file has been successfully downloaded and stored in S3.');
        await trackSentEmail(userEmail);
        
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

async function sendEmail(to, subject, text) {
    const mg = mailgun.client({username: 'api', key: mailgunApiKey});
    await mg.messages.create(mailgunDomain, {
        from: 'postmaster@csyenscc.me',
        to: ['sahithireddysahi27@gmail.com'],
        subject: subject,
        text: text
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.log(err)); // logs any error
}

async function trackSentEmail(to) {
    var params = {
        TableName: tableName,
        Item: {
          'email' : to,
          'Timestamp' : new Date().toISOString()
        }
      };

      await docClient.put(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data);
        }
      }).promise();
    console.log('Email tracking information saved to DynamoDB.');
}
