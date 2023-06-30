const nodemailer= require('nodemailer')
const {MY_EMAIL, MY_PASSWORD}= require('../config/index')

const transporter= nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: MY_EMAIL,
        pass: MY_PASSWORD 
    }
})

async function sendEmail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: MY_EMAIL,
            to: to,
            subject: subject,
            text: text
        });
  
        console.log('Email sent:', info.response);
    }   catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports= sendEmail