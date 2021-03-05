// ==UserScript==
// @name         ITS AWS login
// @namespace    http://tampermonkey.net/
// @version      0.4.1
// @description  Ease my login exeprience with AWS
// @author       Quanlin Chen
// @match        https://its-sso.nwea.org/adfs/ls/IdpInitiatedSignOn.aspx
// @match        https://signin.aws.amazon.com/saml
// @resource     style   file://D:/AWS_plugin.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==
/* jshint -W097 */
//debugger;
'use strict';

function addJQuery(callback){
    if(typeof(unsafeWindow) != undefined && (unsafeWindow.jQuery) != undefined){
        if(typeof(unsafeWindow.tb_init)!='undefined') {
            tb_init=unsafeWindow.tb_init;
        }
        jQuery = unsafeWindow.jQuery;
        callback(unsafeWindow.jQuery);
    }else{
        var script = document.createElement("script");
        script.setAttribute("src", "https://code.jquery.com/jquery-3.6.0.min.js");
        script.addEventListener('load',function(){
            addCryptoJS(callback);
        },false);
        document.head.appendChild(script);
    }
}

function addCryptoJS(callback) {
    var script = document.createElement("script");
    script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.min.js");
    script.addEventListener('load',function(){
        var script = document.createElement("script");
        script.textContent = "(" + callback.toString() + ")(jQuery, CryptoJS);";
        document.body.appendChild(script);
    },false);
    document.head.appendChild(script);
}

function main($, CryptoJS){
    const secretPhrase = 'secret';

    //targets
    let siteDropdown;
    let signInButton;
    let awsSignInButton;

    //accordion observer
    let accordionObserver = {
        components: [],
        update: function(target) {
          $.each(this.components, function(index, elem) {
              elem.update(target);
          });
        }
    };


    let modal = `<div id="configModal" class="modal">
                   <div class="modal-content">
                     <span class="close">&times;</span>
                     Default account <select name="accountName"></select>
                     <br>
                     Auto log me in for <select name="duration"></select>
                     <br>
                     <button type="button">Save</button>
                   </div>
                </div>`

    let optionsForDefaultAccount=[];

    let configButton = "<button id=\"configBtn\">Config</button>";

    let metaData = {};

    function makeURL(dest, linkText){
        return '<a href="' + dest + '" target="_blank">' + linkText + '</a>';
    }

    function makeOptionElement(display, value) {
        return "<option value=\"" + value + "\">" + display + "</option>";
    }

    function organize() {
        let prd_accounts = [];
        let int_accounts = [];
        let dev_accounts = [];
        let other_accounts = [];

        $.each(metaData, function(key, value) {
            const token = key.split('-')
            if(token.includes('prd')){
                prd_accounts.push(value);
            } else if(token.includes('int')) {
                int_accounts.push(value);
            } else if(token.includes('dev')) {
                dev_accounts.push(value);
            } else {
                other_accounts.push(value);
            }
        });

        //move to new location
        $(dev_accounts).each(function(index) {
            $('#dev-accounts').append($(this));
        });

        $(int_accounts).each(function(index) {
            $('#int-accounts').append($(this));
        });

        $(prd_accounts).each(function(index) {
            $('#prd-accounts').append($(this));
        });

        $(other_accounts).each(function(index) {
            $('#other-accounts').append($(this));
        });
    }

    //Populate options for default account selection in config modal
    function popuateAccountSelectOptions() {
         optionsForDefaultAccount.forEach(function(option){
             $('select[name="accountName"]').append(option);
         });
    }

    function populateLoginExpiryOption() {
        let availableOptions = {//key is measured in hours, 0 means no auto login
            0: "never",
            1: "1 hour",
            2: "2 hours",
            5: "5 hours",
            12: "12 hours",
            24: "24 hours"
        };

        $.each(availableOptions, function(key, value){
            $('select[name="duration"]').append($("<option></option>").prop("value", key).text(value));
        });

        //set default if exists in local storage
        let expiryDuration = localStorage.getItem('expiryDuration');
        if(expiryDuration) {
            $('select[name="duration"]').val(expiryDuration/(60*60*1000));
        }
    }

    function constructObservedComponent (component) {
        return {
         target: component,
            display: function() {
                return this.target.css('display');
            },
            update: function (source) {
                if(source.prop('id') === this.target.prop('id')) {
                    this.target.show("fast");
                } else {
                    this.target.hide("fast");
                }
            }
        }
    }

    function buildUI(){
         //strip aws account names from DOM and construct a map using application name as key and relative dom as value

        $('.saml-account-name').each(function (index) {
            let tokens = $(this).text().split(' ');
            let key = tokens[1];
            let value = tokens[2].replace(/[()]/g,"");;

            //build selections based off keys
            optionsForDefaultAccount.push(makeOptionElement(key, value));

            //modify the element layout before pushing to metaData
            // 1. get rid of the leading string "Accounts: " in title
            // 2. add radio button in the front of each account name and remove original triangle icon
            // 3. hide saml role css class
            const shortDisplayName = $(this).text().slice(9);
            $(this).text(shortDisplayName);

            $(this).prev().before(`<input type="radio" name="accountIndex" class="account-radio">`);
            $(this).prev().hide();

            metaData[key] = $(this).parents('.saml-account');
        });

        $('fieldset').after(`
            <div>
                <div id="dev-container" class="saml-role-description env">Development
                    <div id="dev-accounts"></div>
                </div>
                <div id="int-container" class="saml-role-description env">Integration
                    <div id="int-accounts"></div>
                </div>
                <div id="prd-container" class="saml-role-description env">Production
                    <div id="prd-accounts"></div>
                </div>
                <div id="other-container" class="saml-role-description env">Other
                    <div id="other-accounts"></div>
                </div>
            </div>`);

        //add config button
        $('#content').before(configButton);

        //add modal template
        $('#container').after(modal);

        //add a new div for better UI experience, later role selection div will be moved into this one together with its title
        $('p').before(`<div class="role-display"></div>`);

        //add search bar
        $('p').after('<div class="searchBar"><span class="title">Search account</span> <input type="text" id="accountSearch" class="accountSearch" placeholder="Search for account name..."></div>');

        //add role selection section
        $('.role-display').append($('p'));
        $('.role-display').append(`<div id="role-selection"></div>`);

        popuateAccountSelectOptions();
        populateLoginExpiryOption();

        //register observable components
        accordionObserver.components.push( constructObservedComponent($('#dev-accounts')),
                                          constructObservedComponent($('#int-accounts')),
                                          constructObservedComponent($('#prd-accounts')),
                                          constructObservedComponent($('#other-accounts')));
        $('#accountSearch').focus();
    }

    function searchAccount() {
        const input = $('#accountSearch').val().toLowerCase();
        const filteredAccounts = $.map(Object.keys(metaData), (account, index) => {
          return account.indexOf(input) > -1 ? account: null;
        });

        //meta data contains a key value map, "account name" => "target DOM element"
        $.each(metaData, (account, elem) => {
          if(filteredAccounts.includes(account)) {
              elem.show();
          } else {
              elem.hide();
          }
        });

        //if found match in other hidden panel, expand the first panel that contains the matched account
        $('div[id$="-container"]').each(function(){
          const matchedAccounts = $(this).children(':first').children().filter(function(index, elem) {
              return $(elem).css('display') === 'block'
          })
          if(matchedAccounts.length > 0){
              //open the contained panel through click
              $(this).click();
              // select the account if that's the only match
              if(matchedAccounts.length === 1) {
                  matchedAccounts.find('.account-radio').click();
              }
              //break out the each loop
              return false;
          }
        })
    }

    function bindEvents(){
        $('div[id$="-container"]').on('click', function() {
            accordionObserver.update($(this).children(':first'));
        });

        //prevent inner elements' default behavior on click event
        $('div[id$="-container"]').on('click', '.saml-account', function(e){ e.stopPropagation();});

        //add keyup event for account search text field
        $('#accountSearch').on('keyup', searchAccount);

        //events for modal

        // When the user clicks the button, open the modal
        $('#configBtn').on('click', function() {
            $('#configModal').show();
        });

        // When the user clicks on <span> (x), close the modal
        $('.close').on('click', function() {
            $('#configModal').hide();
        });

        // When the user clicks anywhere outside of the modal, close it
        $(window).on('click', function(event) {
            if (event.target == $('#configModal').get(0)) {
                $('#configModal').hide();
            }
        });

        //save default account selection to local storage
        $('.modal-content').find('button').on('click', function() {
            let defaultAccount = $('select[name="accountName"]').val();
            localStorage.setItem('defaultAccount', defaultAccount);

            //the duration user wants for auto login, the actual expiry time will be calculated and stored when login action is performed
            let expiryDuration = +($('select[name="duration"]').val())*60*60*1000;
            localStorage.setItem('expiryDuration', expiryDuration);

            setDefaultAccount(defaultAccount);

            //close modal
            $('#configModal').hide();
        });

        //put current time as last sign in date
        awsSignInButton.click(function () {
            localStorage.setItem('lastSignInDate', (new Date).getTime());
        });

        //remove existing handler on the 'saml-account' element
        $('.account-radio').parent().removeAttr('onclick');
        //add event to handle account row click on the new UI
        $('.saml-account:even').on('click', function () {
            const radioBtn = $(this).find('.account-radio');
            radioBtn.prop('checked',true);

            //Move(copy and hide original element) role selection to the designated section
            $('#role-selection').children().remove();
            radioBtn.parent().siblings('.saml-account').children().clone(true).appendTo('#role-selection');
            //change the copied element's class name so it won't be affected by hiding the original ones
            $('#role-selection').children('.saml-role').prop('class','role-select');
            //select the first available role by default
            $('.role-select').first().click();
        });
    }

    function setDefaultAccount(account) {
        //clean up previous highlighted label if any
        $('.highlight').removeClass('highlight');
        $('.saml-account-name').each(function() {
            if($(this).text().includes(account)) {
                $(this).addClass('highlight');
                $(this).siblings('.account-radio').click();
                //expand the cooresponding panel
                $(this).closest('div[id$=container]').click();
            }
        });
    }

    //change password
    let passwordModal = `<div id="passwordModal" class="modal">
                                 <div class="modal-content">
                                 <span class="close">&times;</span>
                                 New password <input type="password" name="password"/>
                                 <button id="bt_password_save" type="button" class="password">Save</button>
                                 </div>
                               </div>`;
    const saveCredential = function() {
        const userName = $('#userNameInput').val();
        const password = $('input[name="password"]').val();
        if(userName && password) {
            localStorage.setItem('userName', userName);
            const encryptedPassword = CryptoJS.AES.encrypt(password, secretPhrase).toString();
            localStorage.setItem('password', encryptedPassword);
        }
    }

    function decipher(cipheredText) {
        return CryptoJS.AES.decrypt(cipheredText, secretPhrase).toString(CryptoJS.enc.Utf8)
    }

    let autoLogin = (function($){

        let init = function(){
            if(location.href == "https://its-sso.nwea.org/adfs/ls/IdpInitiatedSignOn.aspx") {
                if($('#userNameInput').length > 0){ //in case that we need to type in credentials.
                    //attempt once and if it failed, most likely due to password expiry, wait for manual login and update password
                    if ($('#errorText').text() !== "") { //presume the error is due to incorrect password
                        throw "possible expired password";
                    }
                    //if name is stored, then fetch credential from local storage
                    const userName = localStorage.getItem('userName');
                    const encryptedPassword = localStorage.getItem('password');
                    if(userName) {
                        $('#userNameInput').val(userName);
                        $('#passwordInput').val(decipher(encryptedPassword));
                        $('#submitButton').click();
                    }
                } else {
                    siteDropdown = $('[name="RelyingParty"]');
                    signInButton = $('[name="SignInGo"]');
                    signInButton.click();
                }
            }

            if(location.href == "https://signin.aws.amazon.com/saml") {
                awsSignInButton = $('#signin_button');
                buildUI();
                organize();
                bindEvents();
            }

            //if local storage has a default account set, once the modal is open, default account should be selected
            //the account in the main list should also be selected. In the case of more than one radio button is available
            //to the same account, first one will be picked.
            let defaultAccount = localStorage.getItem('defaultAccount');
            if(defaultAccount) {
                $('select[name="accountName"]').val(defaultAccount);
                setDefaultAccount(defaultAccount);
            }

            //if there's a expiryDate, check current time against it and determine whether auto login or not.
            let expiryDuration = localStorage.getItem('expiryDuration');
            let lastSignInDate = localStorage.getItem('lastSignInDate');
            if(expiryDuration) {
                let now = (new Date).getTime();
                if(now - expiryDuration <= lastSignInDate) {
                    awsSignInButton.click();
                }
            }
        };

        return{
            init: init,
            saveCredential: saveCredential
        };
    }(jQuery, CryptoJS));

    try {
        autoLogin.init();
    } catch (e) {
        console.log(e);
        $('#fullPage').prepend(passwordModal);
        $('#passwordModal').show();
        $('#bt_password_save').on('click', function() {
            saveCredential();
            $('#passwordModal').hide();
            $('#passwordInput').val(decipher(localStorage.getItem('password')));
            $('#submitButton').click();
        });
    }
};

window.addEventListener("load", addJQuery(main));
let style = GM_getResourceText("style");
GM_addStyle(style);

