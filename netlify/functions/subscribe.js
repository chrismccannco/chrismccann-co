// Netlify Function: subscribe.js
// Receives assessment results, subscribes user to Beehiiv and enrolls in band-specific automation.

const PUBLICATION_ID = 'pub_e500b531-8dc6-42b7-85f7-fa7476b5c964';

const BAND_AUTOMATION_MAP = {
  autopilot:         'aut_2b65f90d-c0d8-4e6e-8878-eeea0c0216ca',
  paying_attention:  'aut_8a517822-666c-4953-82a1-d0804b928684',
  holding_the_field: 'aut_378ef9a8-3163-4dd2-b375-4d6f33466e2b'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.BEEHIIV_API_KEY;
  if (!API_KEY) {
    console.error('BEEHIIV_API_KEY not set');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, result_band, score_total, score_state, score_field } = body;

  if (!email) {
    return { statusCode: 400, body: 'Missing email' };
  }

  const validBands = ['autopilot', 'paying_attention', 'holding_the_field'];
  const isAssessment = result_band && validBands.includes(result_band);

  try {
    // Step 1: Subscribe to publication
    const subRes = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          utm_source: isAssessment ? 'field-assessment' : 'homepage',
          utm_medium: isAssessment ? result_band : 'organic',
          utm_campaign: isAssessment ? 'assessment-results' : 'homepage',
          reactivate_existing: true,
          send_welcome_email: !isAssessment
        })
      }
    );

    const subData = await subRes.json();

    if (!subRes.ok) {
      console.error('Beehiiv subscription error:', subRes.status, JSON.stringify(subData));
      return { statusCode: 500, body: 'Subscription failed' };
    }

    // Step 2: Enroll in band-specific automation
    if (isAssessment && BAND_AUTOMATION_MAP[result_band]) {
      const automationId = BAND_AUTOMATION_MAP[result_band];
      const autoRes = await fetch(
        `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/automations/${automationId}/subscribers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      if (!autoRes.ok) {
        const autoErr = await autoRes.text();
        console.error('Automation enrollment error:', autoRes.status, autoErr);
        // Non-fatal: subscriber is added, automation enrollment failed
      } else {
        console.log('Enrolled in automation:', result_band, automationId);
      }
    }

    console.log('Subscribe success:', email, isAssessment ? result_band : 'homepage');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, body: 'Internal error' };
  }
};
