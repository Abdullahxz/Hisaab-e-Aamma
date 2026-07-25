export const REPO_URL = 'https://github.com/Abdullahxz/Hisaab-e-Aamma'
export const ISSUES_URL = `${REPO_URL}/issues`
export const REPORT_ERROR_URL =
  `${ISSUES_URL}/new?labels=data-correction&title=${encodeURIComponent('Data correction: ')}` +
  `&body=${encodeURIComponent(
    [
      '**Which figure looks wrong?** (page / node / ministry, and the value shown)',
      '',
      '**What should it be, and where does the official document say so?**',
      '(document name + page number, if you have it)',
      '',
      '---',
      'Thanks for helping keep this accurate.',
    ].join('\n')
  )}`
export const OFFICIAL_BUDGET_URL = 'https://www.finance.gov.pk/fb_2026_27.html'
