import * as functions from 'firebase-functions';
import * as shell from 'shelljs';
import { readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export const runReportOnce = functions.runWith({ timeoutSeconds: 540, memory: '4GB' }).https.onRequest((request, response) => {
    const { reportVersion, latestVersion, messages } = runReport();
    response.send(`hello version is ${reportVersion}, latest is ${latestVersion}, messages are ${messages}`);
});

export const scheduledReport = functions.runWith({ timeoutSeconds: 540, memory: '4GB' }).pubsub.schedule('every 5 minutes').onRun((context) => {
    console.log('This will be run every 5 minutes!');
    runReport();
});

const TMP_DIR = '/tmp/tmp_me';
const REPORT_REPO_DIR = `${TMP_DIR}/bundle-definition-samples`;
const GIT_UNAME = functions.config().git.uname;
const GIT_EMAIL = functions.config().git.email;
const GIT_TOKEN = functions.config().git.token;

function runReport(): any {
    // make tmp dir
    shell.mkdir(TMP_DIR);

    // Set up the report repo which has the bundle definitions and where we store the generated reports
    setupReportRepo();

    const { version: reportVersion } = require(`${REPORT_REPO_DIR}/reports/version.json`);
    const latestVersion = JSON.parse(shell.exec('npm info firebase@exp --json').stdout).version;

    let messages = '';
    // We should regenerate reports because there is a newer version
    if (latestVersion !== reportVersion) {
        messages = generateReports(latestVersion);

        // push to github
        pushReportsToGithub(latestVersion);
    }
    // clean up
    deleteTmpDir();
    return { reportVersion, latestVersion, messages };
}

function pushReportsToGithub(version: string) {
    shell.cd(REPORT_REPO_DIR);

    shell.exec(`git config user.name ${GIT_UNAME}`);
    shell.exec(`git config user.email ${GIT_EMAIL}`);

    shell.exec('git add *');
    shell.exec(`git commit -m "size report for firebase@${version}"`);

    shell.exec(`git push https://${GIT_UNAME}:${GIT_TOKEN}@github.com/Feiyang1/bundle-definition-samples.git main`);
}

// 1. generate reports
// 2. put reports in bundle-definition-samples/reports
// 3. update bundle-definition-samples/reports/version.json with the version of the SDK we used to generate the reports
function generateReports(latestVersion: string) {
    const messages = [];

    for (const file of readdirSync(`${REPORT_REPO_DIR}/definitions`)) {
        const definitionPath = `${REPORT_REPO_DIR}/definitions/${file}`;
        const reportPath = `${REPORT_REPO_DIR}/reports/${file}`;
        shell.exec(`node ${resolve(__dirname, '../tools/size-analysis-cli.js')} bundle -i ${definitionPath} -m npm -b both -o ${reportPath}`);

        messages.push(`generated report in ${reportPath}`);
    }

    writeFileSync(`${REPORT_REPO_DIR}/reports/version.json`, JSON.stringify({ version: latestVersion }));
    return messages.join('\r\n');
}

function setupReportRepo() {
    const reportRepo = 'https://github.com/Feiyang1/bundle-definition-samples.git';
    shell.cd(TMP_DIR);
    shell.exec(`git clone ${reportRepo}`);
}

function deleteTmpDir() {
    shell.rm('-rf', TMP_DIR);
}