import AWS from 'aws-sdk'
import fetch from 'node-fetch';
import { Storage } from '@google-cloud/storage'
import Mailgun from 'mailgun.js';
import formData from 'form-data'
const mailgun = new Mailgun(formData);
const gcsKey = process.env.GCP_KEY;
const gcsbucketName = process.env.GCS_BUCKET_NAME;
const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;
const tableName = process.env.DYNAMODB_NAME;
const keyBuffer = Buffer.from(gcsKey, 'base64');
const keyData = JSON.parse(keyBuffer.toString('utf-8'));
console.log(keyData)
AWS.config.update({region: 'us-west-1'});
var docClient = new AWS.DynamoDB.DocumentClient();

export async function handler(event) {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message)
    const { submissionUrl, userEmail } = snsMessage;
    try {
        const response = await fetch(submissionUrl);
        let email_status = 'Failure'
        let text = ''
        if (!response.ok) {
            text = `Failed to fetch file - Invalid Submission url ${submissionUrl}`
        }
        else{
            const fileBuffer = Buffer.from(await response.arrayBuffer());
            const filepath = await uploadToGCS(fileBuffer, userEmail);
            email_status = 'Success'
            text = `The file has been uploaded to GCS ${gcsbucketName}/${filepath}`
        }
        await sendEmail(userEmail, `Download Status - ${email_status}`, text);
        await trackSentEmail(userEmail, email_status);
        
    }
    catch(ex){
        console.log(ex)
    }
}

async function uploadToGCS(data,userEmail) {
    try{
        const storage = new Storage({
            credentials: keyData,
          });
        const bucket = storage.bucket(gcsbucketName);
        const timestamp = new Date().toISOString()
        const filepath = `${userEmail}/${timestamp}_submission.zip`
        const file = bucket.file(filepath);
        await file.save(data, { contentType: 'text/plain' });
        console.log('File uploaded to Google Cloud Storage successfully.');
        return filepath;
        } catch (error) {
            console.error('Error:', error.message);
            throw new Error('Failed to process the Lambda function.');
        }
}

async function sendEmail(to, subject, text) {
    const mg = mailgun.client({username: 'api', key: mailgunApiKey});
    await mg.messages.create(mailgunDomain, {
        from: 'sahithi@csyenscc.me',
        to: [to],
        subject: subject,
        text: text
    })
    .then(msg => console.log(msg)) 
    .catch(err => console.log(err)); 
}

async function trackSentEmail(to, email_status) {
    var params = {
        TableName: tableName,
        Item: {
          'UserEmail' : to,
          'Timestamp' : new Date().toISOString(),
          'Email Status' : email_status
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
