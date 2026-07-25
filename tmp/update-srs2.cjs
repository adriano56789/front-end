const { Client } = require('ssh2');

const conn = new Client();

const NEW_CONF = [
  'listen              1935;',
  'max_connections     1000;',
  'srs_log_tank        console;',
  'daemon              off;',
  'in_docker           on;',
  'empty_ip_ok         on;',
  'pithy_print_ms      10000;',
  'grace_start_wait    2300;',
  'grace_final_wait    3200;',
  'disable_daemon_for_docker on;',
  'auto_reload_for_docker on;',
  '',
  '',
  'http_api {',
  '    enabled         on;',
  '    listen          1985;',
  '    crossdomain     on;',
  '}',
  '',
  'http_server {',
  '    enabled         on;',
  '    listen          8080;',
  '    dir             ./objs/nginx/html;',
  '}',
  '',
  'rtc_server {',
  '    enabled         on;',
  '    listen          8000;',
  '    candidate       2.25.192.154;',
  '    api_as_candidates   on;',
  '    resolve_api_domain  on;',
  '    keep_api_domain     off;',
  '    use_auto_detect_network_ip on;',
  '    ip_family           ipv4;',
  '}',
  '',
  'vhost __defaultVhost__ {',
  '    hls {',
  '        enabled             on;',
  '        hls_path            ./objs/nginx/html;',
  '        hls_fragment        2;',
  '        hls_window          20;',
  '        hls_cleanup         on;',
  '        hls_dispose         60;',
  '        hls_wait_keyframe   off;',
  '        hls_ctx             off;',
  '        hls_ts_ctx          off;',
  '    }',
  '    http_remux {',
  '        enabled     on;',
  '        mount       [vhost]/[app]/[stream].flv;',
  '    }',
  '    rtc {',
  '        enabled         on;',
  '        rtmp_to_rtc     on;',
  '        rtc_to_rtmp     on;',
  '    }',
  '    http_hooks {',
  '        enabled         on;',
  '        on_publish      http://app-backend:3000/api/srs/publish;',
  '        on_unpublish    http://app-backend:3000/api/srs/unpublish;',
  '        on_play         http://app-backend:3000/api/srs/play;',
  '        on_stop         http://app-backend:3000/api/srs/stop;',
  '        on_dvr          http://app-backend:3000/api/srs/dvr;',
  '        on_hls          http://app-backend:3000/api/srs/hls;',
  '        on_hls_notify   http://app-backend:3000/api/srs/hls_notify;',
  '    }',
  '}',
].join('\n');

conn.on('ready', () => {
  console.log('SSH CONNECTED');

  const escaped = NEW_CONF.replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/\$/g, '\\$');
  const cmd = `docker exec app-srs bash -c "cat > /usr/local/srs/conf/srs.conf << 'ENDOFCONF'\n${NEW_CONF}\nENDOFCONF" && echo "CONFIG WRITTEN" && docker exec app-srs grep -E "hls_dispose|hls_ctx|hls_ts_ctx|hls_fragment|hls_window" /usr/local/srs/conf/srs.conf && echo "=== RESTART ===" && docker restart app-srs && sleep 3 && docker ps --filter name=app-srs --format "{{.Status}}" && echo "DONE"`;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('exec error:', err); conn.end(); return; }
    let out = '';
    stream.stdout.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
    stream.on('close', () => {
      console.log(out);
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
  process.exit(1);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  readyTimeout: 15000,
  tryKeyboard: true
});

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
});
