const { Parse, Comment } = require('../parse-rest')

const editComment = async ({ user, text, commentId }) => {
  const query = new Parse.Query(Comment)
  const comment = await query.get(commentId, { sessionToken: user.sessionToken })
  comment.set('text', text)
  await comment.save(null, { sessionToken: user.sessionToken })
  return comment.toJSON()
}

editComment.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { text, commentId } = req.body
    res.send(await editComment({ user, text, commentId }))
  } catch (err) {
    next(err)
  }
}

module.exports = editComment
