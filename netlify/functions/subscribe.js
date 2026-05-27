// Netlify Function: subscribe.js
// Receives assessment results, subscribes user to Beehiiv with band-specific UTM tags
// so Beehiiv automations can send the right personalized email.

const PUBLICATION_ID = 'pub_e500b531-8dc6-42b7-85f7-fa7476b5c964';

exports.handler = async (event) => {
  // Handle CORS preflight
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
    const res = await fetch(
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
          send_welcome_email: !isAssessment  // homepage subscribers get welcome; assessment gets personalized email
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Beehiiv API error:', res.status, JSON.stringify(data));
      return { statusCode: 500, body: 'Subscription failed' };
    }

    console.log('Beehiiv subscribe success:', email, isAssessment ? result_band : 'homepage', isAssessment ? 'total: ' + score_total : '');

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
