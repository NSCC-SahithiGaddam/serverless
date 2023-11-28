import AWS from 'aws-sdk'
import fetch from 'node-fetch';
import { Storage } from '@google-cloud/storage'
import Mailgun from 'mailgun.js';
import formData from 'form-data'
const mailgun = new Mailgun(formData);
const s3 = new AWS.S3();

//const GCPkeyFilePath = '/Users/sahithigaddam/Downloads/gcp-dev-406420-5a57742b000a.json';
const gcsKey = process.env.GCP_KEY;
const gcsbucketName = process.env.GCS_BUCKET_NAME;
const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;
const tableName = process.env.DYNAMODB_NAME;



AWS.config.update({region: 'us-west-1'});
var docClient = new AWS.DynamoDB.DocumentClient();

export async function handler(event) {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message)
    const { submissionUrl, userEmail } = snsMessage;
    try {
        const response = await fetch(submissionUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        await uploadToGCS(fileBuffer);
        await sendEmail(userEmail, 'Download Status', 'The file has been successfully downloaded and stored in S3.');
        await trackSentEmail(userEmail);
        
    }
    catch(ex){
        console.log(ex)
    }
}

async function uploadToGCS(data) {
    try{
        const storage = new Storage({
            credentials: JSON.parse(gcsKey),
          });
        const bucket = storage.bucket(gcsbucketName);
        const file = bucket.file('submission.zip');
        await file.save(data, { contentType: 'text/plain' });
        console.log('File uploaded to Google Cloud Storage successfully.');
        return 'Success';
        } catch (error) {
            console.error('Error:', error.message);
            throw new Error('Failed to process the Lambda function.');
        }
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
