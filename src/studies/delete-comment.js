const { Parse, Comment, Study } = require('../parse-rest')

const deleteComment = async ({ user, commentId, studyId}) => {
  const query = new Parse.Query(Comment)
  const comment = await query.get(commentId, { sessionToken: user.sessionToken })
  comment.set('user', null)
  await comment.save(null, { sessionToken: user.sessionToken })
  
  const y = new Parse.Query(Study)
  const parseStudy = await y.get(studyId, { sessionToken: user.sessionToken })
  parseStudy.set('numberOfComments', (parseStudy.get('numberOfComments') || 0) - 1) 
  await parseStudy.save(null, { sessionToken: user.sessionToken })

  return comment.toJSON()

}

deleteComment.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { commentId, studyId } = req.body
    res.send(await deleteComment({ user, commentId, studyId }))
  } catch (err) {
    next(err)
  }
}

module.exports = deleteComment
