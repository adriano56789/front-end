const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  
  // Step 1: backup
  conn.exec('cp /app/srs-docker.conf /app/srs-docker.conf.bak', (err, stream) => {
    if (err) { console.error(err); conn.end(); process.exit(1); return; }
    stream.on('close', () => {
      console.log('Backup OK');
      // Step 2: write config using a temp script
      const writeCmd = 'cat > /app/srs-docker.conf';
      conn.exec(writeCmd, (err2, stream2) => {
        if (err2) { console.error(err2); conn.end(); process.exit(1); return; }
        const conf = `listen              1935;
max_connections     1000;
srs_log_tank        console;
daemon              off;
in_docker           on;
empty_ip_ok         on;

http_api {
    enabled         on;
    listen          1985;
    crossdomain     on;
}

http_server {
    enabled         on;
    listen          8080;
    dir             ./objs/nginx/html;
}

rtc_server {
    enabled         on;
    listen          8000;
    candidate       2.25.192.154;
    api_as_candidates   on;
    resolve_api_domain  on;
    keep_api_domain     off;
    use_auto_detect_network_ip on;
    ip_family           ipv4;
}

vhost __defaultVhost__ {
    hls {
        enabled             on;
        hls_path            ./objs/nginx/html;
        hls_fragment        2;
        hls_window          20;
        hls_cleanup         on;
        hls_dispose         60;
        hls_wait_keyframe   off;
        hls_ctx             off;
        hls_ts_ctx          off;
    }
    http_remux {
        enabled     on;
        mount       [vhost]/[app]/[stream].flv;
    }
    rtc {
        enabled         on;
        rtmp_to_rtc     on;
        rtc_to_rtmp     on;
    }
    http_hooks {
        enabled         on;
        on_publish      http://app-backend:3000/api/srs/publish;
        on_unpublish    http://app-backend:3000/api/srs/unpublish;
        on_play         http://app-backend:3000/api/srs/play;
        on_stop         http://app-backend:3000/api/srs/stop;
        on_dvr          http://app-backend:3000/api/srs/dvr;
        on_hls          http://app-backend:3000/api/srs/hls;
        on_hls_notify   http://app-backend:3000/api/srs/hls_notify;
    }
}`;
        stream2.stdin.write(conf);
        stream2.stdin.end();
        stream2.on('close', () => {
          console.log('Config written');
          // Step 3: verify and restart
          conn.exec('grep hls_dispose /app/srs-docker.conf && docker restart app-srs && sleep 3 && docker ps --filter name=app-srs --format "{{.Status}}" && echo DONE', (err3, stream3) => {
            if (err3) { console.error(err3); conn.end(); process.exit(1); return; }
            let out = '';
            stream3.stdout.on('data', (d) => { out += d.toString(); });
            stream3.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
            stream3.on('close', () => {
              console.log(out);
              conn.end();
              process.exit(0);
            });
          });
        });
      });
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
