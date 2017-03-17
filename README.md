# zypHubLib

Javascript Library for ZypHub messaging

# Message Patterns

Message patterns are built-in workflows that simplify communication tasks.  Patterns define the type of action that the message originator and the message recipient can take on a particular message, and the system behavior on the message for any specific action.

Within the ConversePoint system these are the superset of message actions.

Action | Meaning | System Behavior
-------|---------|-----------------
Read | Mark the conversation as read | Conversation originator is notified of action
Reply | Add content to the message thread | All conversation participants receive the updated content
Close | Terminate the conversation | Conversation is removed from all participants active queue
Leave | Stop participating in a conversation | Conversation is removed from the participants queue, remaining participants are notified of this action.
Forward | Add a new participant to the conversation | New participant is added to the conversation, all participants are notified of the addition
Delegate | Substitute one participant for another | Conversation is removed from participants active queue, added to new participants queue, all remaining participants are notified of change.
Accept | Agree to participate in conversation | Conversation originator is notified of action, if agreement limit is reached Conversation is removed from other participants active queue.
Reject | Reject participation in conversation | Conversation originator is notified of action, Conversation is removed from participants active queue.
OK | Acknowledge receipt of conversation | Conversation originator is notified of action, Conversation is removed from participants active queue.

These are the currently supported message patterns:

* **STANDARD**

 One to one, one to many messaging. Similar to email/text messaging. Used for request/reply communications.

* **FYI**

 Information dissemination messaging. Used to deliver information and receive notification that recipient has read that message.

* **FCFS**

 Task/Action messaging. Used to find one or more participants from a larger group who are able/willing to act on the information in the original message.


Message Pattern	| Originator Action Choices	| Recipient Action Choices
----------------|---------------------------|-------------------------
Standard | REPLY, FORWARD, CLOSE | READ, REPLY, LEACE, FORWARD, DELEGATE
FYI | FORWARD, CLOSE | OK
FCFS | REPLY, FORWARD, CLOSE | REPLY, ACCEPT, REJECT, FORWARD, DELEGATE

# Example

    // instantiate the library and register event handlers
    var zyp = new Zyp();
    zyp.onNotification(userNotificationHandler);
    zyp.onMessageList(messageListHandler);
    zyp.onError(errorHandler);

    // login the user
    zyp.loginByEnterpriseToken(userId, enterpriseToken);

    // handle user notifications
    var userNotificationHandler = function(type, data, context){
        switch (type) {
            case 'login:enterpriseToken':
                // once logged into an enterprise fetch its users
                zyp.getEnterpriseUsers();
                break;

            case 'enterprise:users':
                enterpriseUsers = data;
                // having the enterprise user to zypId mapping fetch the users message list
                zyp.getMessageList();
                break;
        }
    };

    var messageListHandler = function(data, context) {
        // process the message list
        messageList = data;
        ...
    }

    var errorHandler = function(type, data, context) {
        // handle error messages
        ...
    }


# Create and Update a message

    // send a new message
    var message = {
        pattern = 'STANDARD',
        members = ['enterpriseId1', 'enterpriseId2', 'zypHubId1'],   // can mix enterprise and zyphubId's to address users
        content = 'this is a message, enjoy it please'
    }

    zyp.newMessage(msg);

    // handle user notifications
    var userNotificationHandler = function(type, data, context){
        switch (type) {
            ...

            case 'message:new':
                newMessageId = data
                break;
        }
    };

    // reply to an existing message

    // get the ZypHub message
    var msg = messageList[selectedIndex];

    msg.update('REPLY', 'I am replying to this message');

