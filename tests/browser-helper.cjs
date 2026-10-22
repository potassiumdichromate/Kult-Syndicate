const {chromium}=require('playwright');
const baseURL=(process.env.BASE_URL||'http://localhost:8787/').replace(/\/?$/,'/');
const launch=()=>chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.BROWSER_ARGS_JSON?JSON.parse(process.env.BROWSER_ARGS_JSON):['--enable-unsafe-swiftshader']});
module.exports={launch,baseURL};
