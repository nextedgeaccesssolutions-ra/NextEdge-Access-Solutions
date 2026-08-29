# NEAS CMS Administrator Guide

## Access and roles

Open the Staff portal from the public website and sign in using an approved NEAS account. The CMS checks the account role on every protected operation. Editors can prepare and save drafts, reviewers can approve or reject submissions, publishers can publish approved work, and Super Administrators can manage roles and protected global settings. A user without an approved staff role is shown a staff-only access screen and cannot open the editor workspace.

## Editing a page

Open **Pages**, choose a page, and select **Edit**. The center canvas shows the current page. Choose a block from the library, drag it into the canvas, or use **Add section**. Select a section to open its settings. Content fields are deliberately plain-language fields rather than raw HTML or code. Use the section controls to move, duplicate, hide, or remove a section. Save the draft when the content is ready for review.

## Responsive preview

Use the device selector in the editor toolbar to review Mobile, Tablet, Laptop, or Desktop layouts. The editor uses safe responsive defaults and limits design controls to approved typography, spacing, colors, and layouts. Always review the mobile view before submitting a page for approval.

## Review and publication

A normal publishing path is **Draft → Pending review → Approved → Published**. Editors submit a draft for review. Reviewers may add a comment and approve or reject it. Publishers can publish approved content immediately or choose a scheduled date. The public site reads published content only; drafts and review states are not public. Unpublishing returns the page to a non-public state, and rollback restores an earlier revision as a new draft for review.

## Media and global sections

Upload images and documents through **Media library**, add meaningful alt text, and reuse approved assets rather than uploading duplicates. Global sections such as the header, navigation, announcement bar, footer, contact details, and legal links are maintained centrally. Before a global section is published, review the pages affected and keep the rollback option available.

## SEO checks

Each page includes an SEO title, meta description, URL slug, canonical URL, index setting, and social-sharing fields. Resolve warnings for missing titles, descriptions, alt text, duplicate URLs, broken links, missing headings, multiple H1 headings, unpublished linked pages, and overly long metadata before approval. These checks improve content quality but do not guarantee search rankings.

## Contact submissions

Public contact forms are validated before submission and stored in **Submissions** for authorized staff review. Treat submitted personal information as confidential. Review the message, update its status, and archive it only when the NEAS process is complete.

## Safety and recovery

Never paste scripts, API keys, database queries, or server configuration into content fields. The structured block model prevents arbitrary code execution. If a published change needs to be reversed, open the page revision history, choose the prior revision, and use rollback. The rollback becomes a new draft so the normal approval process remains intact.
