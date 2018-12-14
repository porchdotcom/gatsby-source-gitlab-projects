var assert = require('assert');
var crypto = require('crypto');
var path = require('path');
var request = require('request-promise');

const PROJECTS_PER_PAGE = 100; // gitlab max

const getProjectsRequest = (gitlabClient, searchParams) => (page, resolveWithFullResponse) => (
    gitlabClient.get({
        url: '/api/v4/projects',
        qs: {
            archived: false,
            simple: false,
            page,
            'per_page': PROJECTS_PER_PAGE,
            ...searchParams
        },
        resolveWithFullResponse
    })
);

const getReadmeForBranch = (gitlabClient, projectId, readmeName, branch) => (
    gitlabClient.get({
        url: `/api/v4/projects/${projectId}/repository/files/${readmeName}/raw`,
        qs: {
            'ref': branch
        }
    })
);

const getProjectsForGroupRequest = (gitlabClient, groupId, searchParams) => (page, resolveWithFullResponse) => (
    gitlabClient.get({
        url: `/api/v4/groups/${groupId}/projects`,
        qs: searchParams,
        resolveWithFullResponse
    })
);

exports.sourceNodes = async ({
    boundActionCreators: {
        createNode
    },
    createNodeId
}, {
        gitlab: {
            domain,
            privateToken
        } = {},
        includeReadme = false,
        searchParams = {},
        groupId
    }) => {
    assert(domain, 'options.gitlab.domain object required');
    assert(privateToken, 'options.gitlab.privateToken object required');

    const gitlabClient = request.defaults({
        baseUrl: domain,
        headers: {
            'Private-Token': privateToken
        },
        json: true
    });

    const getProjectsForPage = groupId ? getProjectsForGroupRequest(gitlabClient, groupId, searchParams) : getProjectsRequest(gitlabClient, searchParams);
    const { headers, body } = await getProjectsForPage(1, true);
    const totalPages = parseInt(headers['x-total-pages'], 10);

    if (totalPages === 0) { return; }

    const pagePromises = Array(...Array(totalPages - 1)).map((value, index) => getProjectsForPage(index + 2, false));
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
            const readmeName = path.basename(project.readme_url);
            readmePromises.push(
                getReadmeForBranch(gitlabClient, project.id, readmeName, project.default_branch)
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
