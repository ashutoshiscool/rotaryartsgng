const url = process.env.SUPABASE_URL + '/storage/v1/bucket/rotaryarts';
fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ public: true })
}).then(res => res.json()).then(console.log).catch(console.error);

fetch(process.env.SUPABASE_URL + '/storage/v1/bucket', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'rotaryarts', public: true })
}).then(res => res.json()).then(console.log).catch(console.error);
