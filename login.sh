#!/bin/bash

function processInput {
    if [ $# -eq 0 ]; then
        print_usage
        exit 1
    fi
    while [[ $# -gt 0 ]]
    do
        arg="$1"

        case $arg in
            -e|--env)
                validateEnv "$2"
                ENVIRONMENT="$2"
                shift
                shift
                ;;
            -p|--project)
                PROJECT="$2"
                shift
                shift
                ;;
            -l|--list)
                listRoles
                echo "$ROLES_META_DATA"
                shift
                exit 0
                ;;
            -h)
                print_usage
                shift
                exit 0
                ;;
        esac
    done
}

function validateEnv {
    local ENV=$1
    case $ENV in
        "dev"|"int"|"prd")
            return 0
            ;;
        *)
            echo "Invalid environment name, it should only be 'dev', 'int', or 'prd'"
            exit 1
            ;;
    esac
}

function print_usage {
    echo "This script will login you in AWS via SAML2.0, using default user and credential setup in the initial phase. \n
    it will take these arguments, \n
    -e or --env to indicate which envrionment you will login to \n
    -p or --project to indicate which project you will be login to \n
    -l or --list to list all available roles to your specific account \n
    you project name should match to any existing AWS role that's been presetup in AWS"
}

function listRoles {
    if ! type "saml2aws" > /dev/null; then
        echo "please install saml2aws first"
    else
        ROLES_META_DATA="$(saml2aws list-roles --skip-prompt)"
    fi
}

function constructMatchingString {
    if [ -z "$ENVIRONMENT" ]; then
        echo "Please specify environment"
        exit 1
    elif [ -z "$PROJECT" ]; then
        echo "Please specify project name"
        exit 1
    else
        MATCHING_STRING="$PROJECT"-"$ENVIRONMENT"
    fi
}

function findMatchingRole {
    MATCHING_ROLE=$(echo "$ROLES_META_DATA" | sed -n "/$MATCHING_STRING/{n;p;}")

    if [ -z "$MATCHING_ROLE" ]; then
        return 1
    else
        return 0
    fi
}

function login {
    "$(saml2aws login --force --skip-prompt --role $MATCHING_ROLE)"
}

function main {
    processInput $@
    constructMatchingString
    listRoles
    findMatchingRole

    if [ $? -eq 0 ]; then
        login
    else
        echo "No maching role, please check if you have the right role setup in AWS or you made a typo"
        exit 1
    fi

    exit 0
}

#end of function definition

#start the main process
main $@
#to sanitise aws credential file due to aws provider plugin flaw
sed -i '' -E 's/ +/ /g' ~/.aws/credentials
