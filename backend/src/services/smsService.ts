import crypto from 'crypto';

/**
 * DLT (Distributed Ledger Technology) compliant SMS Gateway Service.
 * Implements TRAI regulations for transactional OTP delivery across Indian telecom operators.
 * 
 * Required DLT Parameters:
 * - Entity ID / PE ID (Principal Entity ID registered on DLT portal)
 * - Sender ID / Header (6-character approved alphabetic header, e.g. NXGATE)
 * - Template ID / DLT_TE_ID (Approved Content Template ID)
 * - Template Message (Exact approved text matching telecom whitelist)
 */

export interface DltSmsConfig {
  provider: 'fast2sms' | 'msg91' | 'textlocal' | 'custom';
  apiKey: string;
  senderId: string;
  entityId: string;
  templateId: string;
  gatewayUrl?: string;
  messageTemplate: string;
}

export function getDltConfig(): DltSmsConfig {
  const provider = (process.env.SMS_GATEWAY_PROVIDER as any) || (process.env.MSG91_AUTH_KEY ? 'msg91' : 'fast2sms');
  return {
    provider: provider,
    apiKey: process.env.MSG91_AUTH_KEY || process.env.SMS_API_KEY || '',
    senderId: process.env.MSG91_SENDER_ID || process.env.SMS_SENDER_ID || 'NXBTGT',
    entityId: process.env.DLT_ENTITY_ID || '',
    templateId:
      process.env.MSG91_OTP_FLOW_ID ||
      process.env.MSG91_OTP_TEMPLATE_ID ||
      '6afe75b4c04be06f2a0f7422',
    gatewayUrl: process.env.SMS_GATEWAY_URL || '',
    messageTemplate:
      process.env.SMS_MESSAGE_TEMPLATE ||
      '{OTP} is your OTP for NexGate login. Valid for 10 minutes. Do not share this code with anyone. - NexBuild Technologies',
  };
}

/**
 * Generates a cryptographically strong 6-digit numeric OTP.
 */
export function generateSecureOtp(digits: number = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return crypto.randomInt(min, max).toString();
}

/**
 * Sends a transactional OTP SMS adhering to Indian DLT guidelines.
 * 
 * @param mobile 10-digit Indian mobile number
 * @param otp 6-digit OTP string
 */
export async function sendDltOtpSms(
  mobile: string,
  otp: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  messageTemplate: string;
  renderedMessage: string;
}> {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const config = getDltConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  // Format the approved message template safely
  const template = config.messageTemplate.includes('{OTP}')
    ? config.messageTemplate
    : '{OTP} is your OTP for NexGate login. Valid for 10 minutes. Do not share this code with anyone. - NexBuild Technologies';
  const messageText = template.replace('{OTP}', otp);

  // Detailed Template & Outgoing SMS Log
  console.log(`\n==================== [DLT-SMS DISPATCH] ====================`);
  console.log(`[DLT-SMS] Recipient Mobile : +91-${cleanMobile}`);
  console.log(`[DLT-SMS] SMS Provider     : ${config.provider.toUpperCase()}`);
  console.log(`[DLT-SMS] Sender Header    : ${config.senderId}`);
  console.log(`[DLT-SMS] MSG91 Flow ID    : ${config.templateId}`);
  console.log(`[DLT-SMS] DLT Template ID  : ${process.env.MSG91_OTP_DLT_TE_ID || '1177179499136995960'}`);
  console.log(`[DLT-SMS] Template Format  : "${template}"`);
  console.log(`[DLT-SMS] SMS Sent To User : "${messageText}"`);
  console.log(`============================================================\n`);

  // If no SMS API key is configured
  if (!config.apiKey) {
    if (isProduction) {
      console.warn(
        `[DLT-SMS] [CRITICAL] SMS_API_KEY is not configured in production environment! DLT OTP (${otp}) could not be transmitted via SMS to +91-${cleanMobile}.`
      );
    } else {
      console.log(
        `[DLT-SMS] [DEV-SIMULATION] Header: ${config.senderId} | Template ID: ${config.templateId || 'N/A'} | Entity ID: ${config.entityId || 'N/A'}`
      );
      console.log(
        `[DLT-SMS] [DEV-SIMULATION] SMS to +91-${cleanMobile}: "${messageText}"`
      );
    }
    return {
      success: !isProduction, // In non-prod, succeed simulation; in prod, flag misconfiguration
      messageId: `sim_${Date.now()}`,
      error: isProduction ? 'SMS Gateway credentials not configured in production' : undefined,
      messageTemplate: template,
      renderedMessage: messageText,
    };
  }

  try {
    switch (config.provider.toLowerCase()) {
      case 'fast2sms': {
        // Fast2SMS DLT Route API
        const endpoint = 'https://www.fast2sms.com/dev/bulkV2';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authorization: config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'dlt',
            sender_id: config.senderId,
            message: config.templateId, // Template ID used as message identifier in Fast2SMS DLT
            variables_values: `${otp}|NexGate|10`,
            flash: 0,
            numbers: cleanMobile,
          }),
        });

        const data: any = await response.json();
        if (data.return === true || data.status_code === 200) {
          console.log(`[DLT-SMS] Fast2SMS dispatched successfully to +91-${cleanMobile}. Request ID: ${data.request_id || ''}`);
          return { success: true, messageId: data.request_id, messageTemplate: template, renderedMessage: messageText };
        } else {
          console.error(`[DLT-SMS] Fast2SMS dispatch error:`, data);
          return { success: false, error: data.message?.[0] || data.message || 'Fast2SMS dispatch failed', messageTemplate: template, renderedMessage: messageText };
        }
      }

      case 'msg91': {
        // MSG91 Flow API with DLT template
        const endpoint = 'https://control.msg91.com/api/v5/flow/';
        const vars = {
          otp: otp,
          OTP: otp,
          VAR1: otp,
          var1: otp,
          var: otp,
          VAR: otp,
          code: otp,
          num: otp,
          num1: otp,
          VAR2: 'NexGate',
          var2: 'NexGate',
          alp: 'NexGate',
          alp1: 'NexGate',
          app: 'NexGate',
          VAR3: '10',
          var3: '10',
          minutes: '10',
          num2: '10',
          DLT_TE_ID: process.env.MSG91_OTP_DLT_TE_ID || '1177179499136995960',
        };

        const payload = {
          template_id: config.templateId,
          flow_id: config.templateId,
          sender: config.senderId,
          short_url: '0',
          mobiles: `91${cleanMobile}`,
          ...vars,
          recipients: [
            {
              mobiles: `91${cleanMobile}`,
              ...vars,
            },
          ],
        };

        console.log(`[DLT-SMS] [MSG91] Sending request to Flow API:`, {
          endpoint,
          template_id: config.templateId,
          sender: config.senderId,
          mobile: `91${cleanMobile}`,
          otpCode: otp,
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authkey: config.apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch (_) {
          data = { raw: rawText };
        }

        console.log(`[DLT-SMS] [MSG91-FLOW-RESPONSE] HTTP ${response.status}:`, JSON.stringify(data));

        if ((data.type === 'success' || (response.ok && data.type !== 'error')) && data.type !== 'error') {
          console.log(`[DLT-SMS] MSG91 Flow dispatched successfully to +91-${cleanMobile}. Message/Req ID: ${data.message || 'ok'}`);
          return { success: true, messageId: data.message, messageTemplate: template, renderedMessage: messageText };
        } else {
          console.warn(`[DLT-SMS] MSG91 Flow dispatch error:`, data, `Attempting MSG91 OTP API fallback...`);
          try {
            const otpUrl = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(config.templateId)}&mobile=91${cleanMobile}&authkey=${encodeURIComponent(config.apiKey)}&otp=${encodeURIComponent(otp)}&otp_expiry=10`;
            const otpRes = await fetch(otpUrl, { method: 'POST' });
            const otpRaw = await otpRes.text();
            let otpData: any = {};
            try {
              otpData = JSON.parse(otpRaw);
            } catch (_) {
              otpData = { raw: otpRaw };
            }
            console.log(`[DLT-SMS] [MSG91-OTP-FALLBACK-RESPONSE] HTTP ${otpRes.status}:`, JSON.stringify(otpData));
            if ((otpData.type === 'success' || (otpRes.ok && otpData.type !== 'error')) && otpData.type !== 'error') {
              console.log(`[DLT-SMS] MSG91 OTP API fallback dispatched successfully to +91-${cleanMobile}`);
              return { success: true, messageId: otpData.message || otpData.request_id, messageTemplate: template, renderedMessage: messageText };
            }
            return {
              success: false,
              error: `MSG91 Flow failed: ${data.message || rawText}. Fallback: ${otpData.message || otpRaw}`,
              messageTemplate: template,
              renderedMessage: messageText,
            };
          } catch (fallbackErr: any) {
            console.error(`[DLT-SMS] MSG91 OTP API fallback failed:`, fallbackErr.message);
            return {
              success: false,
              error: `MSG91 Flow failed: ${data.message || rawText}. Fallback error: ${fallbackErr.message}`,
              messageTemplate: template,
              renderedMessage: messageText,
            };
          }
        }
      }

      case 'textlocal': {
        // Textlocal India API
        const endpoint = 'https://api.textlocal.in/send/';
        const params = new URLSearchParams();
        params.append('apiKey', config.apiKey);
        params.append('sender', config.senderId);
        params.append('numbers', `91${cleanMobile}`);
        params.append('message', messageText);
        if (config.templateId) params.append('template_id', config.templateId);
        if (config.entityId) params.append('entity_id', config.entityId);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: params,
        });

        const data: any = await response.json();
        if (data.status === 'success') {
          console.log(`[DLT-SMS] Textlocal dispatched successfully to +91-${cleanMobile}`);
          return { success: true, messageId: data.batch_id, messageTemplate: template, renderedMessage: messageText };
        } else {
          console.error(`[DLT-SMS] Textlocal dispatch error:`, data);
          return { success: false, error: data.errors?.[0]?.message || 'Textlocal dispatch failed', messageTemplate: template, renderedMessage: messageText };
        }
      }

      case 'custom':
      default: {
        // Generic Custom DLT HTTP Gateway (e.g. Gupshup, ValueFirst, Airtel IQ, Twilio)
        if (!config.gatewayUrl) {
          throw new Error('SMS_GATEWAY_URL must be specified for custom provider');
        }

        const url = config.gatewayUrl
          .replace('{MOBILE}', cleanMobile)
          .replace('{OTP}', otp)
          .replace('{SENDER_ID}', config.senderId)
          .replace('{TEMPLATE_ID}', config.templateId)
          .replace('{ENTITY_ID}', config.entityId)
          .replace('{API_KEY}', config.apiKey);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            mobile: cleanMobile,
            otp: otp,
            message: messageText,
            sender: config.senderId,
            dltTemplateId: config.templateId,
            dltEntityId: config.entityId,
          }),
        });

        const resText = await response.text();
        console.log(`[DLT-SMS] Custom Gateway HTTP response (${response.status}):`, resText.slice(0, 200));
        return { success: response.ok, messageId: `cust_${Date.now()}`, messageTemplate: template, renderedMessage: messageText };
      }
    }
  } catch (err: any) {
    console.error(`[DLT-SMS] Exception in SMS dispatch:`, err.message);
    return { success: false, error: err.message, messageTemplate: template, renderedMessage: messageText };
  }
}

