
const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const hello = require('./studies/hello')
const logger = require('./logger')

// general
const feedback = require('./email/feedback')
const salesRequest = require('./email/sales-request')

// auth
const checkNameUniqueness = require('./auth/check-name-uniqueness')
const setBio = require('./auth/set-bio')
const addGithubToUser = require('./auth/add-github-to-user')
const removeGithubFromUser = require('./auth/remove-github-from-user')
const checkoutNewTeam = require('./auth/checkout-new-team')
const getTeam = require('./auth/get-team')
const getTeamInvites = require('./auth/get-team-invites')
const getInvite = require('./auth/get-invite')
const acceptInvite = require('./auth/accept-invite')
const deleteInvite = require('./auth/delete-invite')
const getMe = require('./auth/get-me')
const isAdmin = require('./auth/is-admin')
const setNickname = require('./auth/set-nickname')
const uploadProfilePicture = require('./auth/upload-profile-picture')
const getUserSuggestions = require('./studies/get-user-suggestions')
const addMember = require('./auth/add-member')
const removeMember = require('./auth/remove-member')

// studies
const createVersion = require('./studies/create-version')
const getVersion = require('./studies/get-version')
const getRecentStudies = require('./studies/get-recent-studies')
const getExploreStudies = require('./studies/get-explore-studies')
const getStudiesByAuthor = require('./studies/get-studies-by-author')
const getStudy = require('./studies/get-study')
const getStudies = require('./studies/get-studies')
const getSharedWithMeStudies = require('./studies/get-shared-with-me-studies')
const getDownloadUrl = require('./studies/get-download-url')
const createStudy = require('./studies/create-study')
const deleteStudy = require('./studies/delete-study')
const checkVersionExists = require('./studies/check-version-exists')
const getMainFile = require('./studies/get-main-file')
const screenshotStudy = require('./studies/screenshot-study')
const setStudyTitle = require('./studies/set-study-title')
const setStudyPreview = require('./studies/set-study-preview')
const setStudyDescription = require('./studies/set-study-description')
const setStudyVisibility = require('./studies/set-study-visibility')

// comments
const getComments = require('./studies/get-comments')
const editComment = require('./studies/edit-comment')
const createComment = require('./studies/create-comment')
const deleteComment = require('./studies/delete-comment')

// tags
const getTagSuggestions = require('./studies/get-tag-suggestions')
const addTags = require('./studies/add-tags')

// misc
const incrementViews = require('./studies/increment-views')
const toggleStar = require('./studies/toggle-star')
const togglePrivate = require('./studies/toggle-private')
const addCollaborator = require('./studies/add-collaborator')
const removeCollaborator = require('./studies/remove-collaborator')

// containers
const forkStudy = require('./studies/fork-study')
const updateStudy = require('./containers/update-study')
const getContainer = require('./containers/get-container')
const getContainers = require('./containers/get-containers')
const stopContainer = require('./containers/stop-container')
const toggleKeepAlive = require('./containers/toggle-keep-alive')
const startContainer = require('./containers/start-container')
const deleteContainer = require('./containers/delete-container')
const createContainer = require('./containers/create-container')
const getRunningContainers = require('./containers/get-running-containers')
const updateContainerActivity = require('./containers/update-container-activity')

// github
const getGithubRepositories = require('./github/get-github-repositories')
const githubHook = require('./github/github-hook')
const registerHook = require('./github/register-hook')
const unregisterHook = require('./github/unregister-hook')

const requireUser = require('./auth/require-user')
const requireAdmin = require('./auth/require-admin')


const badRequestOnFailure = (func) => async (req, res, next) => {
  func(req, res, (err) => {
    if (err) {
      logger.error(err)
      res.status(400).send({ error: err.message })
    } else {
      next()
    }
  })
}

const passThroughOnFailure = (func) => async (req, res, next) => {
  func(req, res, () => {
    next()
  })
}

const api = express.Router()

// general
api.post(`/feedback`, bodyParser.json(), badRequestOnFailure(requireUser), feedback.handler)
api.post(`/sales-request`, bodyParser.json(), salesRequest.handler)

// auth
api.post(`/check-name-uniqueness`, bodyParser.json(), checkNameUniqueness.handler)
api.post(`/set-bio`, bodyParser.json(), badRequestOnFailure(requireUser), setBio.handler)
api.post(`/is-admin`, bodyParser.json(), badRequestOnFailure(requireAdmin), isAdmin.handler)
api.post(`/set-nickname`, bodyParser.json(), badRequestOnFailure(requireUser), setNickname.handler)
api.post(`/upload-profile-picture`, badRequestOnFailure(requireUser), uploadProfilePicture.handler)
api.post('/get-user-suggestions', bodyParser.json(), badRequestOnFailure(requireUser), getUserSuggestions.handler)
api.post('/add-github-to-user', bodyParser.json(), badRequestOnFailure(requireUser), addGithubToUser.handler)
api.post('/remove-github-from-user', bodyParser.json(), badRequestOnFailure(requireUser), removeGithubFromUser.handler)

// team
api.post('/add-member', bodyParser.json(), badRequestOnFailure(requireUser), addMember.handler)
api.post('/remove-member', bodyParser.json(), badRequestOnFailure(requireUser), removeMember.handler)

api.post('/checkout-new-team', bodyParser.json(), badRequestOnFailure(requireUser), checkoutNewTeam.handler)
api.post('/get-team', bodyParser.json(), badRequestOnFailure(requireUser), getTeam.handler)
api.post('/get-team-invites', bodyParser.json(), badRequestOnFailure(requireUser), getTeamInvites.handler)
api.post('/get-invite', bodyParser.json(), badRequestOnFailure(requireUser), getInvite.handler)
api.post('/accept-invite', bodyParser.json(), badRequestOnFailure(requireUser), acceptInvite.handler)
api.post('/delete-invite', bodyParser.json(), badRequestOnFailure(requireUser), deleteInvite.handler)
api.post('/get-me', bodyParser.json(), badRequestOnFailure(requireUser), getMe.handler)

// studies
api.post('/create-version', createVersion.handler)
api.post('/get-version', bodyParser.json(), getVersion.handler)
api.post('/get-recent-studies', bodyParser.json(), getRecentStudies.handler)
api.post('/get-explore-studies', bodyParser.json(), getExploreStudies.handler)
api.post('/get-studies-by-author', bodyParser.json(), getStudiesByAuthor.handler)
api.post('/get-study', bodyParser.json(), passThroughOnFailure(requireUser), getStudy.handler)
api.post('/get-studies', bodyParser.json(), badRequestOnFailure(requireUser), getStudies.handler)
api.post('/get-shared-with-me-studies', bodyParser.json(), badRequestOnFailure(requireUser), getSharedWithMeStudies.handler)
api.post('/get-download-url', bodyParser.json(), badRequestOnFailure(requireUser), getDownloadUrl.handler)
api.post('/create-study', bodyParser.json(), badRequestOnFailure(requireUser), createStudy.handler)
api.post(`/delete-study`, bodyParser.json(), badRequestOnFailure(requireUser), deleteStudy.handler)
api.post('/check-version-exists', bodyParser.json(), badRequestOnFailure(requireUser), checkVersionExists.handler)
api.post('/get-main-file', bodyParser.json(), passThroughOnFailure(requireUser), compression(), getMainFile.handler)
api.post('/screenshot-study', bodyParser.json(), badRequestOnFailure(requireAdmin), screenshotStudy.handler)
api.post('/set-study-title', bodyParser.json(), badRequestOnFailure(requireUser), setStudyTitle.handler)
api.post('/set-study-preview', badRequestOnFailure(requireUser), setStudyPreview.handler)
api.post('/set-study-description', bodyParser.json(), badRequestOnFailure(requireUser), setStudyDescription.handler)
api.post('/set-study-visibility', bodyParser.json(), passThroughOnFailure(requireUser), compression(), setStudyVisibility.handler)

// comments
api.post('/get-comments', bodyParser.json(), getComments.handler)
api.post('/edit-comment', bodyParser.json(), badRequestOnFailure(requireUser), editComment.handler)
api.post('/create-comment', bodyParser.json(), badRequestOnFailure(requireUser), createComment.handler)
api.post('/delete-comment', bodyParser.json(), badRequestOnFailure(requireUser), deleteComment.handler)

// tags
api.post('/get-tag-suggestions', bodyParser.json(), getTagSuggestions.handler)
api.post('/add-tags', bodyParser.json(), badRequestOnFailure(requireUser), addTags.handler)

// misc
api.post(`/increment-views`, bodyParser.json(), incrementViews.handler)
api.post(`/toggle-star`, bodyParser.json(), badRequestOnFailure(requireUser), toggleStar.handler)
api.post(`/toggle-private`, bodyParser.json(), badRequestOnFailure(requireUser), togglePrivate.handler)
api.post(`/add-collaborator`, bodyParser.json(), badRequestOnFailure(requireUser), addCollaborator.handler)
api.post(`/remove-collaborator`, bodyParser.json(), badRequestOnFailure(requireUser), removeCollaborator.handler)

// containers
api.post('/fork-study', bodyParser.json(), badRequestOnFailure(requireUser), forkStudy.handler)
api.post('/update-study', bodyParser.json(), badRequestOnFailure(requireUser), updateStudy.handler)
api.post('/get-container', bodyParser.json(), badRequestOnFailure(requireUser), getContainer.handler)
api.post('/get-containers', bodyParser.json(), badRequestOnFailure(requireUser), getContainers.handler)
api.post('/stop-container', bodyParser.json(), badRequestOnFailure(requireUser), stopContainer.handler)
api.post('/start-container', bodyParser.json(), badRequestOnFailure(requireUser), startContainer.handler)
api.post('/toggle-keep-alive', bodyParser.json(), badRequestOnFailure(requireUser), toggleKeepAlive.handler)
api.post('/delete-container', bodyParser.json(), badRequestOnFailure(requireUser), deleteContainer.handler)
api.post('/create-container', bodyParser.json(), badRequestOnFailure(requireUser), createContainer.handler)
api.post('/get-running-containers', bodyParser.json(), badRequestOnFailure(requireAdmin), getRunningContainers.handler)
api.post('/update-container-activity', bodyParser.json(), badRequestOnFailure(requireAdmin), updateContainerActivity.handler)

// github
api.post(`/github-hook`, bodyParser.json(), githubHook.handler)
api.post(`/register-hook`, bodyParser.json(), badRequestOnFailure(requireUser), registerHook.handler)
api.post(`/unregister-hook`, bodyParser.json(), badRequestOnFailure(requireUser), unregisterHook.handler)
api.post(`/get-github-repositories`, bodyParser.json(), badRequestOnFailure(requireUser), getGithubRepositories.handler)
api.post(`/hello`, bodyParser.json(), badRequestOnFailure(requireUser), hello.handler)

module.exports = api
