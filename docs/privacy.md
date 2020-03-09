# Privacy Policy

This extension calls JIRA REST API to get information on JIRA worklogs. For the extension to be able to call the APIs successfully, following information is collected from user explicitly in a form (in settings popup of the extensions page):
1. URL of the JIRA site (i.e. {account-domain}.atlassian.com).
2. User's JIRA account's email address.
3. An API token user creates in JIRA to be used in this extension.

The extension stores this information in browser (using localStorage). To fetch the work log information, the extension created the API URL 
using the URL user provided, and passes the email/API token as base64 encoded standard Authorization Header (i.e. basic authentication).

The extension does not use the information user provides in any other way apart from what described above.
