// Generates public/sample.png from John Doe CV data using Playwright.
// Run: node generate-sample.js (requires dev server on port 3000)
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const JOHN_DOE = {
    resume: {
        contact: {
            name: 'John Doe',
            title: 'Software Engineer',
            email: 'john.doe@example.com',
            phone: '+1 (555) 123-4567',
            linkedin: 'linkedin.com/in/johndoe',
            github: 'github.com/johndoe',
            portfolio: 'johndoe.dev',
        },
        summary: {
            summary:
                'Results-driven Software Engineer with 3 years of experience building scalable web applications. Passionate about clean code and delivering impactful products.',
        },
        education: [
            {
                degree: 'Bachelor of Science in Computer Science',
                institution: 'State University',
                start: '2018-09',
                end: '2022-05',
                location: 'New York, NY',
                gpa: '3.8/4.0',
            },
        ],
        experience: [
            {
                role: 'Junior Software Engineer',
                company: 'Tech Corp',
                location: 'Remote',
                start: '2022-07',
                end: 'present',
                description:
                    'Developed RESTful APIs serving 100k+ daily active users\nImproved application performance by 30% through code optimization\nCollaborated with cross-functional teams to deliver features on time',
            },
            {
                role: 'Software Engineering Intern',
                company: 'StartupXYZ',
                location: 'San Francisco, CA',
                start: '2021-06',
                end: '2021-12',
                description:
                    'Built React components for the main product dashboard\nWrote unit tests achieving 85% code coverage',
            },
        ],
        projects: [
            {
                title: 'E-Commerce Platform',
                url: 'github.com/johndoe/ecommerce',
                description:
                    'Built a full-stack e-commerce app with React and Node.js\nImplemented payment integration and order management system',
            },
            {
                title: 'Personal Portfolio',
                url: 'johndoe.dev',
                description: 'Designed and developed a responsive portfolio showcasing projects and skills',
            },
        ],
        skills: {
            items: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'Git', 'Docker'],
        },
        certificates: [
            {
                title: 'AWS Certified Developer',
                issuer: 'Amazon Web Services',
                date: '2023-04',
            },
        ],
        languages: [
            { language: 'English', proficiency: 'Native' },
            { language: 'Spanish', proficiency: 'Intermediate' },
        ],
        template: 'classic',
        onePage: 'normal',
        saved: false,
        lang: 'en',
    },
};

function checkServer() {
    return new Promise(resolve => {
        http.get(BASE_URL, () => resolve(true)).on('error', () => resolve(false));
    });
}

async function waitForServer(maxMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        if (await checkServer()) return true;
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

async function main() {
    const running = await checkServer();
    if (!running) {
        console.error(`Dev server not running at ${BASE_URL}. Start it with: npm run dev`);
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    await context.addInitScript(data => {
        localStorage.setItem('reduxState', JSON.stringify(data));
    }, JOHN_DOE);

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/editor`, { waitUntil: 'networkidle' });

    // Wait for react-pdf to render the canvas
    await page.waitForSelector('.react-pdf__Page__canvas', { timeout: 30000 });
    // Extra settle time for canvas paint
    await page.waitForTimeout(2000);

    const canvas = await page.$('.react-pdf__Page__canvas');
    if (!canvas) {
        console.error('PDF canvas not found.');
        await browser.close();
        process.exit(1);
    }

    const outputPath = path.join(__dirname, 'public', 'sample.png');
    await canvas.screenshot({ path: outputPath });

    console.log(`Saved: ${outputPath}`);
    await browser.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
