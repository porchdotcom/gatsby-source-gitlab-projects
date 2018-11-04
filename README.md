# gatsby-source-gitlab-projects
A gatsby plugin for fetching project data for all project in Gitlab

## Usage
```
npm install @porch/gatsby-source-gitlab-projects
```

Add the following to your gatsby-config
```js
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
]
```
