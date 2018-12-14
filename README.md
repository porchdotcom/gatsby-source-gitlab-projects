# gatsby-source-gitlab-projects

Gatsby source plugin for fetching project metadata for projects in Gitlab.

## Usage
```
npm install @porch/gatsby-source-gitlab-projects
```

Add the following to your `gatsby-config.js`
```js
module.exports = {
 plugins: [
    {
      resolve: '@porch/gatsby-source-gitlab-projects',
      options: {
        gitlab: {
          domain: 'your-gitlab-domain',
          privateToken: 'your-private-token',
        },
        includeReadme: true,
        searchParams: {
            // See https://docs.gitlab.com/ee/api/projects.html#list-all-projects
        }
      }
    }
};
```

Sample Gatsbys GraphQL query:
```graphql
{
  allGitLabProject {
    edges {
      node {
        id
        project {
          name
          name_with_namespace
          description
          path
          web_url
          namespace {
            id
            name
          }
        }
      }
    }
  }
}
```
Read the [Gatsby documentation](https://www.gatsbyjs.org/docs/querying-with-graphql/) for help on using GraphQL.
