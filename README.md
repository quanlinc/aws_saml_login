#Summary

This is a user script for browser, so you'll need a tool to help you load the script, the popular one is GreaseMonkey if using Firefox or TamperMonkey for Chrome
Because this script will change the UI, a separate css file is used to achieve that goal, by default, for instance, TamperMonkey does not allow script to access your file system
so you need to grant the permission to it.

Follow these steps to enable local file system access and configure your script to run.
1. After TamperMonkey is installed, go to Chrome Settings-> Extensions -> TamperMonkeys -> Details, turn the following switch on
2. Place css file on your local file system.
3. Copy the content from the AWS_login.js and create a new user script in Tampermonkey, paste the content there or you can use your user script management tool to import from file.
4. Now navigate to the target page and you should see Tampermonkey icon on the right upper corner of your browser indicating there’s one user script running on this page. 
5. Enjoy and give feedback.

##Features
* Auto-login, it will memorize the user name and password, when password expires, it will prompt you for the new one
* Reornagize the account list to be more readable
* Provide a search box for quickly locating the account
* Remove the duplicated role selection section per account and consolidate them to one piece putting in the upper right corner.
* Provides a config modal that allows user to set default account and expiration time in case user wants to stay logged in
(set expiry feature become less used as session life span has been increased in general at AWS account level)


##ToDo
* Add login history in case user is constantly switching accounts and forgot which account was logged into
