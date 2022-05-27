# cn-batch-forms
Angular service for handling batch form updates, to be used with *cn-flex-form*

## Development
Make sure you have dependencies installed
```bash
yarn install
```
To build
```bash
yarn build
```
To watch for file changes and automatically apply them to the relevant service (wildcat will be this example--could also be quicksight)
```bash
bower link
yarn run watch
cd ~/src/wildcat
bower link cn-batch-forms
npx gulp watch
```

## Creating a New Release and Applying It
1. Click "Releases" in the menu at the top of the repo.
2. ![Github Workflow - Step 9](https://user-images.githubusercontent.com/26187383/169494986-64375e44-7458-4282-a276-d913e02b35a4.jpeg)
3. ![Github Workflow - Step 10](https://user-images.githubusercontent.com/26187383/169495049-935da645-cc7e-4fc7-8597-f1716fe0f0d1.jpeg)
4. type the next logical version into the tag
![Github Workflow - Step 12](https://user-images.githubusercontent.com/26187383/169495255-a6bc9331-c3aa-4cf4-b41f-e04133c42567.jpeg)
5. Enter the same tag version string into the Release Title 
![Github Workflow - Step 13](https://user-images.githubusercontent.com/26187383/169495426-f4d2f5f7-7dfa-4b5e-af43-5d6d04dc7bfb.jpeg)
6. ![Github Workflow - Step 17](https://user-images.githubusercontent.com/26187383/169495611-12d4af80-8c75-4540-b10d-fe58a9c04390.jpeg)
7. Go to any service that requires this package in its `bower.json` or any other dependency-documenting file and bump the version!
