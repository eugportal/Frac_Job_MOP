import { createRequire } from 'node:module';
import {
  BodyType,
  ConfigurationApi,
  EmailMessage,
  ExchangeService,
  ExchangeVersion,
  type IXHRApi,
  MessageBody,
  Uri,
} from 'ews-javascript-api';
import { config } from './config.js';

const require = createRequire(import.meta.url);
// This package publishes old TypeScript sources that are incompatible with this
// project's strict compiler settings, so load its supported CommonJS entrypoint.
const { ntlmAuthXhrApi } = require('ews-javascript-api-auth') as {
  ntlmAuthXhrApi: new (
    username: string,
    password: string,
    allowUntrustedCertificate: boolean,
  ) => IXHRApi;
};

// EWS is configured once because ews-javascript-api uses a process-wide XHR implementation.
ConfigurationApi.ConfigureXHR(
  new ntlmAuthXhrApi(
    config.EWS_USERNAME,
    config.EWS_PASSWORD,
    config.EWS_ALLOW_UNTRUSTED_CERTIFICATE,
  ),
);

const exchangeService = new ExchangeService(ExchangeVersion.Exchange2016);
exchangeService.Url = new Uri(config.EWS_URL);

export async function sendOtpEmail(email: string, otp: string) {
  const message = new EmailMessage(exchangeService);
  message.ToRecipients.Add(email);
  message.Subject = 'Your Frac Data Management verification code';
  message.Body = new MessageBody(
    BodyType.Text,
    `Your verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,
  );

  // The message is sent from the mailbox associated with EWS_USERNAME.
  await message.SendAndSaveCopy();
}
