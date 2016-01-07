/**
Copyright 2016 - fds

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/



// setting dependencies
var cfg = require('./config.js');
var msg = require('./messages.js');
var express = require('express');
var cors = require('cors');
var router = express.Router();
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var https = require('https');
var bunyan = require('bunyan');

// setting middleware functions
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

var corsOptions = {
  origin: true,
  methods: 'POST'
};
app.use(cors());

app.use('/sendMail', router);
router.post('/', handleMails);

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Mail sender is listening at http://%s:%s', host, port);
});

// setting mail trasporter
var transporter = nodemailer.createTransport({
	service: 'Gmail',
        auth:{
                user: cfg.fdsMailAccountSender,
                pass: cfg.fdsMailAccountSenderPassword
        }
});

// captcha stuff
var SECRET = '6LeHfhQTAAAAAE9d8OXyDsdKQBr5UPlLsaITk5D3';
var CAPTCHA_URL = "https://www.google.com/recaptcha/api/siteverify?secret=";

// setting logger
var log = bunyan.createLogger({name: "myapp"});
log.level("info");

/**
	send the mail using the message sent from a simple write me form through an HTTP request.
	If it is requested using the carboncopy param the method sends also a carboncopy of the mail to the sender
*/
function handleMails(req, res){

	log.info(" --- handleMails - START ---");

	// Request logger
	log.info("req.body.name        : '" + req.body.name + "'");
	log.info("req.body.email       : '" + req.body.email + "'");
        log.info("req.body.text        : '" + req.body.text + "'");
        log.info("req.body.carboncopy  : '" + req.body.carboncopy + "'");
        log.info("ip                   : '" + req.connection.remoteAddress + "'");
        log.debug("gcaptcha response     : '" + req.body.grecaptcharesponse + "'");
	
        verifyRecaptcha(req.body.grecaptcharesponse, function(success) {
                if (success) {
                        log.info("Captcha SUCCESS!");
			sendmail(req, res);
                } else {
                        log.error("Captcha failed!!!");
			res.status(500).send("captchaFAILED");
                }
         });
}

function sendmail(req, res){	
	transporter.sendMail(mailOptionBuilder(req), function(error, info){
                if(error){
                        log.error("Mail NOT sent, error: '" + error + "'");
			log.warn("CarbonCopy Won't be sent although it has been requested");
			res.status(500).json({outcome: msg.RECIPIENT_SEND_FAIL,ccOutcome: msg.CCOPY_SEND_FAIL});
			log.info(" --- handleMails - END ---");
			
                }else{
                        log.info("Mail sent, response: : '" + info.response + "'");
			if(req.body.carboncopy == 'checked'){
				transporter.sendMail(ccopyOptionBuilder(req), function(error, info){
					if(error){
				                log.error("CarbonCopy NOT sent, error: '" + error + "'");
						res.status(500).json({outcome: msg.RECIPIENT_SEND_SUCCESS,ccOutcome: msg.CCOPY_SEND_FAIL});
					}else{
				                log.info("CarbonCopy sent, response: : '" + info.response + "'");
						res.json({outcome: msg.RECIPIENT_SEND_SUCCESS,ccOutcome: msg.CCOPY_SEND_SUCCESS});
			
					}
					log.info(" --- handleMails - END ---");
				});
			}
			else{
				res.json({outcome: msg.RECIPIENT_SEND_SUCCESS,ccOutcome: msg.CCOPY_NOT_REQUESTED});
				log.info(" --- handleMails - END ---");
			}
                }
        });
}

/**
	composes the mail using the message sent from a simple write me form through an HTTP request
	TODO use a template engine
*/
function mailOptionBuilder(req){

	var subject = req.body.name + ' sent you a message!';
        var text = "--- from: '" + req.body.email + "' ---" + 
			"\r\n--- name: '" + req.body.name + "' ---" +
			"\r\n\r\n--- text:\r\n" + req.body.text + "\r\n---";
        var mailOptions = {
		from: cfg.fdsMailAccountSender,
		to: cfg.fdsMailBox,
		subject: subject,
		text: text
	};
	return mailOptions;
}

/**
	compose the carbon copy of the mail
	TODO use a template engine
*/
function ccopyOptionBuilder(req){

	var subject = cfg.websiteUrl + ': carboncopy of the sent message';
	var text = "--- Hi " + req.body.name  + "! this is the message you just sent me ---" +
			"\r\n\r\n<<\r\n" + req.body.text + "\r\n >>" + 
			"\r\n\r\n Thank you and best regards!";
	var mailOptionsCarboncopy = {
        	from: cfg.fdsMailAccountSender,
        	to: req.body.email,
        	subject: subject,
        	text: text
	};
	return mailOptionsCarboncopy;
}

/*
	Helper function to make API call to recatpcha and check response
*/
function verifyRecaptcha(key, callback) {
        https.get(CAPTCHA_URL + SECRET + "&response=" + key, function(res) {
                        var data = "";
                        res.on('data', function (chunk) {
                                data += chunk.toString();
                        });
                        res.on('end', function() {
                                try {
					log.debug("end verify recaptcha");
                                        var parsedData = JSON.parse(data);
					log.debug("JSON parsed, parsedData.succes: '" + parsedData.success + "' " + JSON.stringify(parsedData));
                                        callback(parsedData.success);
                                } catch (e) {
                                        callback(false);
                                }
                        });
        });
}
