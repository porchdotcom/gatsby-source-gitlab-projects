var assert = require('assert');
var crypto = require('crypto');
var path = require('path');
var request = require('request-promise');

const PROJECTS_PER_PAGE = 100; // gitlab max
const getProjectRequest = (domain, privateToken) => (page, resolveWithFullResponse) => (
    request.get(
        `${domain}/api/v4/projects`, {
            headers: {
                'Private-Token': privateToken
            },
            qs: {
                archived: false,
                simple: false,
                page,
                'per_page': PROJECTS_PER_PAGE
            },
            json: true,
            resolveWithFullResponse
        })
);

exports.sourceNodes = async ({ boundActionCreators: { createNode }, createNodeId },
    { gitlab: { domain, privateToken } = {}, includeReadme = false } ) => {
    assert(domain, 'options.gitlab.domain object required');
    assert(privateToken, 'options.gitlab.privateToken object required');

    const getProjects = getProjectRequest(domain, privateToken);
    const { headers, body } = await getProjects(1, true);
    const totalPages = parseInt(headers['x-total-pages'], 10);

    if (totalPages === 0) { return; }

    const pagePromises = Array(...Array(totalPages - 1)).map((value, index) => getProjects(index + 2, false));
    const projectResponses = await Promise.all(pagePromises);
    const projects = projectResponses.reduce((prev, cur) => prev.concat(cur), body);

    const readmePromises = [];
    projects.forEach(async project => {
        createNode({
            id: createNodeId(`gitlab-project-${project.id}`),
            project,
            internal: {
                type: 'GitLabProject',
                contentDigest: crypto
                    .createHash('md5')
                    .update(project.last_activity_at)
                    .digest('hex')
            }
        });

        if (includeReadme && project.readme_url) {
            const readmeName = path.basename(project.readme_url || '');
            readmePromises.push(request.get(
                `${domain}/api/v4/projects/${project.id}/repository/files/${readmeName}/raw`, {
                    headers: {
                        'Private-Token': privateToken
                    },
                    qs: {
                        'ref': project.default_branch
                    }
                })
                .catch(() => console.error(`failed to fetch README for ${project.path_with_namespace}`))
                .then(readme => {
                    if (readme) {
                        createNode({
                            id: createNodeId(`gitlab-project-${project.id}-readme`),
                            projectId: project.id,
                            internal: {
                                type: 'Readme',
                                content: readme,
                                mediaType: 'text/markdown',
                                contentDigest: crypto
                                    .createHash('md5')
                                    .update(project.last_activity_at)
                                    .digest('hex')
                            }
                        });
                    }
                })
            );
        }
    });

    return Promise.all(readmePromises);
};
