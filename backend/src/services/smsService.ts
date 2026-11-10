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
    senderId: process.env.MSG91_SENDER_ID || process.env.SMS_SENDER_ID || 'NXGATE',
    entityId: process.env.DLT_ENTITY_ID || '',
    templateId:
      process.env.MSG91_OTP_FLOW_ID ||
      process.env.MSG91_OTP_TEMPLATE_ID ||
      process.env.DLT_TEMPLATE_ID ||
      '',
    gatewayUrl: process.env.SMS_GATEWAY_URL || '',
    messageTemplate:
      process.env.SMS_MESSAGE_TEMPLATE ||
      'Your OTP for NexGate login is {OTP}. Valid for 10 minutes. Please do not share this OTP with anyone. - NexBuild Technologies',
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
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const config = getDltConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  // Format the approved message template
  const messageText = config.messageTemplate.replace('{OTP}', otp);

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
            variables_values: otp,
            flash: 0,
            numbers: cleanMobile,
          }),
        });

        const data: any = await response.json();
        if (data.return === true || data.status_code === 200) {
          console.log(`[DLT-SMS] Fast2SMS dispatched successfully to +91-${cleanMobile}. Request ID: ${data.request_id || ''}`);
          return { success: true, messageId: data.request_id };
        } else {
          console.error(`[DLT-SMS] Fast2SMS dispatch error:`, data);
          return { success: false, error: data.message?.[0] || data.message || 'Fast2SMS dispatch failed' };
        }
      }

      case 'msg91': {
        // MSG91 Flow API with DLT template
        const endpoint = 'https://control.msg91.com/api/v5/flow/';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            authkey: config.apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            template_id: config.templateId,
            sender: config.senderId,
            short_url: '0',
            mobiles: `91${cleanMobile}`,
            otp: otp,
            VAR1: otp,
            var1: otp,
            code: otp,
          }),
        });

        const data: any = await response.json();
        if (data.type === 'success' || response.ok) {
          console.log(`[DLT-SMS] MSG91 Flow dispatched successfully to +91-${cleanMobile}`);
          return { success: true, messageId: data.message };
        } else {
          console.error(`[DLT-SMS] MSG91 dispatch error:`, data);
          return { success: false, error: data.message || 'MSG91 dispatch failed' };
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
          return { success: true, messageId: data.batch_id };
        } else {
          console.error(`[DLT-SMS] Textlocal dispatch error:`, data);
          return { success: false, error: data.errors?.[0]?.message || 'Textlocal dispatch failed' };
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
        return { success: response.ok, messageId: `cust_${Date.now()}` };
      }
    }
  } catch (err: any) {
    console.error(`[DLT-SMS] Exception in SMS dispatch:`, err.message);
    return { success: false, error: err.message };
  }
}

