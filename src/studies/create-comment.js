const analytics = require('../analytics')
const getUsernames = require('../utils/get-usernames-from-text')
const { Parse, Comment, Study, User } = require('../parse-rest')
const send = require('../email/mail')

const removeDuplicatesByKey = (myArr) => {
  return myArr.filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj.objectId).indexOf(obj.objectId) === pos
  })
}

const getParent = async (user, parentId) => {
  const y = new Parse.Query(Comment)
  y.include('user')
  y.include('parent')
  y.equalTo('objectId', parentId)
  const parseParentComments = await y.find({ sessionToken: user.sessionToken })

  if (parseParentComments.length === 0) {
    return null
  }

  const parseParentComment = parseParentComments[0]
  const parentComment = parseParentComment.toJSON()    
  return parentComment
}

const getParents = async (user, parentId) => {
  let comments = []
  
  if (parentId) {
    const comment = await getParent(user, parentId)
    comments = comments.concat(comment)
   
    if (comment.parent) {
      const parentComments = await getParents(user, comment.parent.objectId)
      comments = comments.concat(parentComments)
    }
    
    return comments    
  }
}

const createComment = async ({ user, text, studyId, parentId }) => {
  const comment = new Comment()
  comment.set('text', text)
  
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  comment.set('user', parseUser)

  const query = new Parse.Query(Study)
    
  // Increase the number of comments for this study
  const parseStudy = await query.get(studyId, { sessionToken: user.sessionToken })
  parseStudy.set('numberOfComments', (parseStudy.get('numberOfComments') || 0) + 1) 
  parseStudy.save(null, { sessionToken: user.sessionToken })
  
  query.equalTo('objectId', studyId)
  query.include('user')
  const results = await query.find({ sessionToken: user.sessionToken })

  const parseResultStudy = results[0]
  comment.set('study', parseResultStudy)

  // get study meta 
  const study = parseResultStudy.toJSON()
  const studyOwner = study.user
  const studyOwnerNickname = study.user.nickname
  const studyOwnerEmail = study.user.username
  const studyName = study.name
  const commenterNickname = user.nickname

  if(text){
    const mentionedUsers = getUsernames(text, { nameOnly: true })

    mentionedUsers.forEach(async (nickname) => {
      const u = new Parse.Query(Parse.User)
      u.equalTo('nickname', nickname)
      const parseUsers = await u.find()
      if (parseUsers.length >= 0) {
        const parseUser = parseUsers[0]
        const mentionedUser = parseUser.toJSON()
        const mentionUserEmail = mentionedUser.username

        if (mentionedUser !== commenterNickname) {
          const messageToMentionUser = {
            from: `support@kyso.io`,
            to: mentionUserEmail,
            subject: `${commenterNickname} has mentioned you on a Kyso comment`,
            text: `<p>Hi ${nickname},</p>
            <p><a href="https://kyso.io/${commenterNickname}">@${commenterNickname}</a> has mentioned you on a comment on the study "${studyName}"</p>
            <p>They wrote:</p>
            <p>&nbsp;</p>
            <p><em>${text}</em></p>
            <p>&nbsp;</p>
            <p>Go to the study to see more: <a href="https://kyso.io/${studyOwnerNickname}/${studyName}">https://kyso.io/${studyOwnerNickname}/${studyName}</a></p>
            <p>Cheers,</p>
            <p>The Kyso team</p>`
          }
          send(messageToMentionUser)
        }
      }
    })
  }

  let ownerIsACommenter = false
  
  if (parentId) {
    const parents = await getParents(user, parentId)
    
    const parentComment = new Comment()
    parentComment.id = parentId
    comment.set('parent', parentComment)
    
    const users = parents.map(parent => parent.user)  
    const uniqueUsers = removeDuplicatesByKey(users)
    
    // does not include commenter
    const commentersToNotify = uniqueUsers.filter(_user => _user.nickname !== user.nickname)
    ownerIsACommenter = commentersToNotify.find(_user => _user.nickname === studyOwner.nickname)

    commentersToNotify.forEach(user => {
      const parentNickname = user.nickname 
      const parentEmail = user.username
      const messageToParents = {
        from: `support@kyso.io`,
        to: parentEmail,
        subject: `${commenterNickname} has written a reply to your Kyso comment`,
        text: `<p>Hi ${parentNickname},</p>
        <p><a href="https://kyso.io/${commenterNickname}">@${commenterNickname}</a> has replied to your comment on the study "${studyName}" by <a href="https://kyso.io/${studyOwnerNickname}">${studyOwnerNickname}</a></p>
        <p>They wrote:</p>
        <p>&nbsp;</p>
        <p><em>${text}</em></p>
        <p>&nbsp;</p>
        <p>Go to the study to respond: <a href="https://kyso.io/${studyOwnerNickname}/${studyName}">https://kyso.io/${studyOwnerNickname}/${studyName}</a></p>
        <p>Cheers,</p>
        <p>The Kyso team</p>`
        }
      send(messageToParents)
    })
  } else {
    comment.set('parent', null)
  }

  // notify owner if they are not the same as the commenter
  if(!ownerIsACommenter && (user.nickname !== studyOwner.nickname)) {
    // send email to owner
    const messageToOwner = {
      from: `support@kyso.io`,
      to: studyOwnerEmail,
      subject: `${commenterNickname} commented on your Kyso study ${studyName}`,
      text: `<p>Hi ${studyOwnerNickname},</p>
      <p><a href="https://kyso.io/${commenterNickname}">@${commenterNickname}</a> has commented on your study "${studyName}"</p>
      <p>They wrote:</p>
      <p>&nbsp;</p>
      <p><em>${text}</em></p>
      <p>&nbsp;</p>
      <p>Go to your study to respond: <a href="https://kyso.io/${studyOwnerNickname}/${studyName}">https://kyso.io/${studyOwnerNickname}/${studyName}</a></p>
      <p>Cheers,</p>
      <p>The Kyso team</p>`
    }
    send(messageToOwner)
  }
  
  const commentACL = new Parse.ACL(parseUser)
  commentACL.setPublicReadAccess(true)
  commentACL.setWriteAccess('role:kyso', true)
  commentACL.setReadAccess('role:kyso', true)
  comment.setACL(commentACL)
  await comment.save(null, { sessionToken: user.sessionToken })

  analytics.track('Created Comment', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    'Comment Author': user.nickname,
    'Study Author': study.user.nickname,
    'Study Name': study.name,
    'Study Id': study.objectId,
    'Study Fullname': `${study.user.nickname}/${study.name}`
  })

  return {
    ...comment.toJSON(),
    user
  }
}

createComment.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { text, studyId, parentId } = req.body
    res.send(await createComment({ user, text, studyId, parentId }))
  } catch (err) {
    next(err)
  }
}

module.exports = createComment
