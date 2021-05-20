const nodemailer = require("nodemailer");
const ObjectsToCsv = require("objects-to-csv");
const utils = {};

utils.sendEmail = async (data, message, email) => {
  try {
    if (data.length) {
      const csv = new ObjectsToCsv(data);
      const fileName = +new Date();
      await csv.toDisk(`./csv/${fileName}.csv`);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        secure: false,
        port: 587,
        auth: {
          user: "otrstaging@gmail.com",
          pass: "Nothing@133",
        },
      });

      let mailContent = {
        from: "otrstaging@gmail.com ",
        to: email,
        subject: message,
        text: message,
        attachments: [
          {
            filename: `${fileName}.csv`,
            path: `./csv/${fileName}.csv`,
          },
        ],
      };

      transporter.sendMail(mailContent, function (error, data) {
        if (error) {
          console.log("Unable to send mail", error);
        }
        if (data) {
          console.log("Email send successfully");
        }
      });
    } else {
      console.log("No data found");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        secure: false,
        port: 587,
        auth: {
          user: "otrstaging@gmail.com",
          pass: "Nothing@133",
        },
      });

      let mailContent = {
        from: "otrstaging@gmail.com ",
        to: email,
        subject: message,
        text: "No transaction found for specified block number",
      };

      transporter.sendMail(mailContent, function (error, data) {
        if (error) {
          console.log("Unable to send mail", error);
        }
        if (data) {
          console.log("Email send successfully");
        }
      });
    }
  } catch (err) {
    console.log("error in catch", err);
  }
};

module.exports = utils;
