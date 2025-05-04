// prettier-ignore
import read from 'read-file-stdin'
import {parse as parseToml} from 'toml'
import univeil from 'univeil'

const srcFn = process.argv[2]

read(srcFn, (err, data) => {
  const safeInvisibleChars = '\n';
  if (err) {
    console.error(err);
    return process.exit(4);
  }
  data = parseToml(data);
  data = JSON.stringify(data, null, 2).replace(/^(\{|\[)\n /, '$1');
  data = univeil(data, safeInvisibleChars);
  console.log(data);
});
