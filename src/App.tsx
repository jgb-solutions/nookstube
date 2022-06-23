import { v4 as uuidv4 } from "uuid"
import Button from "@mui/material/Button"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Grid from "@mui/material/Grid"
import IconButton from "@mui/material/IconButton"
import AddIcon from '@mui/icons-material/Add'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import YouTubeIcon from '@mui/icons-material/YouTube'
import { useState, useEffect, useCallback, useRef } from "react"
import Dialog from '@mui/material/Dialog'
import Avatar from '@mui/material/Avatar'
import DialogContent from '@mui/material/DialogContent'
import CloseIcon from '@mui/icons-material/Close'
import DialogTitle from '@mui/material/DialogTitle'
import YouTube, { YouTubePlayer } from 'react-youtube'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import md5 from 'blueimp-md5'

import "./styles.css"
import { createAccount, getAllSessions, login, logout, updateSession, useAuth, useSession } from "./services/firebase"
import { useForm } from "react-hook-form"
import { PartySession, PlayerAction } from "./types"

const SAMPLE_SESSION: PartySession = {
  name: "Afro Fire",
  id: "966308ff-ab7f-4f5e-b02a-aa5806771bdc",
  action: PlayerAction.NULL,
  currentVideoId: "mfQgk6EE_p4",
  time: 0,
  videos: [
    "mfQgk6EE_p4",
    "KYfVSpb5lZk",
    "hOGIUgEP83Q",
    "lm7vdYkpOZs",
    "Gj7eQzJlsU4",
    "4HOMkliFtrE",
    "92St1TBJL2E",
    "25nAvBYAlxU",
    "0OMgS3wNoog",
    "TQ-DDwCZbR4",
    "6V7fkC3_ivg",
  ],
  userId: "Azi372FjqLZPkUsxfcCSvQo8Z3k1"
}

function getYouTubeId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[7].length === 11) ? match[7] : false
}

const playerOptions = {
  playerVars: {
    autoplay: 1,
    controls: 1,
    rel: 0,
  }
}

type FormData = {
  email: string
  password: string
}

const getSessionIdFromUrl = () => {
  const url = new URL(window.location.href)

  return url.searchParams.get("sessionId")
}

function App() {
  const playerRef = useRef<YouTubePlayer>(null)
  const [currentAction, setCurrentAction] = useState<PlayerAction>(PlayerAction.NULL)
  const [shouldShowSessionPage, setShouldShowSessionPage] = useState(() => {
    const sessionId = getSessionIdFromUrl()

    return sessionId !== null
  })
  const { realtimeSession, setSessionIdToWatach } = useSession()

  const [sessions, setSessions] = useState<PartySession[]>([])

  const { user } = useAuth()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    mode: "onBlur"
  })
  const [currentVideoId, setCurrentVideoId] = useState<string>()
  const [session, setSession] = useState(SAMPLE_SESSION)
  const [dialogOpen, setDialogOpen] = useState<string>()
  const [authError, setauthError] = useState("")
  const [videoUrl, setVideoUrl] = useState("")


  const fetchSessions = useCallback(async () => {
    getAllSessions().then(sessionData => {
      setSessions(sessionData)
    })
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleClose = () => {
    setDialogOpen(undefined)
  }

  useEffect(() => {
    if (realtimeSession && user && playerRef.current) {

      if (!currentVideoId) {
        setCurrentVideoId(realtimeSession.currentVideoId)

        playerRef.current.loadVideoById(realtimeSession.currentVideoId)
        playerRef.current.seekTo(realtimeSession.time)
        playerRef.current.playVideo()
      }

      if (realtimeSession.userId === user.uid) {
        return
      }

      if (realtimeSession.action !== currentAction) {
        switch (realtimeSession.action) {
          case PlayerAction.PLAY:
            playerRef.current.seekTo(realtimeSession.time)
            playerRef.current?.playVideo()
            setCurrentAction(PlayerAction.PLAY)
            break
          case PlayerAction.PAUSE:
            playerRef.current.seekTo(realtimeSession.time)
            playerRef.current?.pauseVideo()
            setCurrentAction(PlayerAction.PAUSE)
            break
          case PlayerAction.SEEK:
            playerRef.current?.seekTo(realtimeSession.time)
            setCurrentAction(PlayerAction.SEEK)
            break
          default:
            break
        }
      }

      if (realtimeSession.currentVideoId !== currentVideoId) {
        setCurrentVideoId(realtimeSession.currentVideoId)

        playerRef.current.loadVideoById(realtimeSession.currentVideoId)
        playerRef.current.seekTo(realtimeSession.time)
        playerRef.current.playVideo()
      }
    }

  }, [currentVideoId, realtimeSession, user, session.videos])

  const handleVideoClick = useCallback((videoId: string) => {
    if (!user || !realtimeSession) return

    setCurrentVideoId(videoId)

    const sessionId = getSessionIdFromUrl()

    if (sessionId) {
      updateSession(sessionId, {
        currentVideoId: videoId,
        userId: user.uid,
      })
    }
  }, [user, realtimeSession])

  const playNextVideo = useCallback(() => {
    const currentVideoIndex = session.videos.findIndex(id => id === currentVideoId)
    const nextVideoIndex = currentVideoIndex + 1

    if (!session.videos[nextVideoIndex]) {
      setCurrentVideoId(session.videos[0])
    } else {
      setCurrentVideoId(session.videos[nextVideoIndex])
    }
  }, [currentVideoId, session])

  const handleRemoveVideo = useCallback((videoId: string) => {
    setSession(existingSession => ({ ...existingSession, videos: session.videos.filter(id => id !== videoId) }))

    if (videoId === currentVideoId) {
      playNextVideo()
    }
  }, [currentVideoId, playNextVideo, session.videos])

  const handleAddVideo = useCallback(() => {
    const videoId = getYouTubeId(videoUrl)

    if (videoId) {
      setSession(existingSession => ({ ...existingSession, videos: [...existingSession.videos, videoId] }))
      setVideoUrl("")
    } else {
      alert("We could not find a YouTube video for that URL")
    }
  }, [videoUrl])

  const requireLogin = useCallback(() => {
    if (!user) {
      setDialogOpen("login")
      alert("You must be logged in to join a session. So log in or sign up first.")
      return
    }
  }, [user])

  const handleFormSubmission = useCallback(async ({ email, password }: FormData, logInOrSignUp) => {
    const authAction = logInOrSignUp === "Log In" ? login : createAccount

    try {
      await authAction(email, password)

      reset()
      setDialogOpen(undefined)
    } catch (error) {
      const { message } = error as Error
      console.table(error)
      setauthError(message)
    }
  }, [reset])

  const handleLoadSampleVideos = useCallback(() => {
    setSession(SAMPLE_SESSION)
  }, [])

  const handleLoadSampleSession = useCallback(() => {
    requireLogin()

    setSession(SAMPLE_SESSION)
    setShouldShowSessionPage(true)
  }, [requireLogin])



  const handleJoinSession = useCallback((sessionId) => {
    requireLogin()

    window.location.href = `/?sessionId=${sessionId}`
    // show the session page state to true
    // update the url to include the sessionId as a query param
    // setShouldShowSessionPage(true)

    // window.history.pushState({}, "", `?sessionId=${sessionId}`)
  }, [requireLogin])

  return (
    <Box sx={{
      height: "100vh",
      pb: '2rem',
      pt: '2rem',
      px: '2rem',
      backgroundImage: "url(/assets/images/background.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    }}>
      <Box sx={{
        maxWidth: "1280px",
        mx: "auto",
        py: "2rem",
        bgcolor: 'black',
        color: 'white',
        borderRadius: "2.5rem",
        overflow: "hidden",
        px: '2rem',
      }}>
        <Box sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.5)',
          py: '1rem',
        }}>
          <Typography variant="h4" component="a" href="/" sx={{ color: 'white', textDecoration: 'none' }}>
            NooksTube
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', }}>

            {user && user.email ? (
              <>
                <TextField
                  type="url"
                  placeholder="Paste a YouTube URL"
                  sx={{ mr: '1rem' }}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value.trim())}
                />
                <Button variant="contained" color="primary" size="large" sx={{ height: "55px" }} startIcon={<AddIcon />} onClick={handleAddVideo}>
                  Add
                </Button>
                <Avatar alt="Profile Picture" src={`https://www.gravatar.com/avatar/${md5(user.email)}`} sx={{ ml: '1rem' }} />

                <Button variant="contained" color="warning" size="large" sx={{ height: "55px", ml: '1rem' }} startIcon={<LogoutIcon />} onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="contained" color="primary" size="large" sx={{ height: "55px", ml: '1rem' }} startIcon={<LoginIcon />} onClick={() => {
                  setDialogOpen("Log In")
                  setauthError("")
                }
                }>
                  Log In
                </Button>

                <Button variant="contained" color="primary" size="large" sx={{ height: "55px", ml: '1rem' }} startIcon={<LoginIcon />} onClick={() => {
                  setDialogOpen("Sign Up")
                  setauthError("")
                }}>
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Box>

        {shouldShowSessionPage && user ? (
          <>
            <Box sx={{ py: '1rem' }}>
              <Grid container spacing={3}>
                <Grid item xs={8}>
                  <YouTube
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%" /* 16:9 */,
                      paddingTop: 25,
                      height: 0

                    }}
                    id={`video-${currentVideoId}`}
                    // videoId={currentVideoId}

                    iframeClassName="youtube-iframe"

                    loading={"eager"}

                    onReady={(event) => {
                      playerRef.current = event.target

                      const sessionId = getSessionIdFromUrl()

                      if (sessionId) {
                        setSessionIdToWatach(sessionId)
                      }
                    }}

                    onPlay={(event) => {
                      const sessionId = getSessionIdFromUrl()

                      if (sessionId) {
                        updateSession(sessionId, {
                          time: event.target.getCurrentTime(),
                          action: PlayerAction.PLAY,
                          userId: user.uid,
                        })
                      }
                    }}

                    onPause={(event) => {
                      const sessionId = getSessionIdFromUrl()

                      if (sessionId) {
                        updateSession(sessionId, {
                          time: event.target.getCurrentTime(),
                          action: PlayerAction.PAUSE,
                          userId: user.uid,
                        })
                      }
                    }}

                    onEnd={(event) => {
                      playNextVideo()
                    }}

                    onError={(event) => {
                      console.log(event)
                    }}

                    onStateChange={
                      (event) => {
                        console.log("event target", event.target)
                        document.title = event.target.videoTitle
                        const sessionId = getSessionIdFromUrl()

                        if (sessionId) {
                          updateSession(sessionId, {
                            time: event.target.getCurrentTime(),
                            userId: user.uid,
                          })
                        }
                      }
                    }

                    opts={playerOptions}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ mb: '1.5rem' }}>
                    <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
                      Available videos for this session
                    </Typography>
                  </Box>

                  <Grid container spacing={2} sx={{ height: '450px', overflow: 'auto' }}>
                    {session.videos.map(videoId => (
                      <Grid item xs={6} key={videoId}>
                        <Box sx={{
                          position: 'relative'
                        }}>
                          <Box component="img" src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} sx={{ maxWidth: "100%" }} />
                          <IconButton sx={{ position: 'absolute', transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }} onClick={() => handleVideoClick(videoId)}>
                            <YouTubeIcon sx={{ fontSize: '3rem', color: 'red' }} />
                          </IconButton>
                          <IconButton sx={{ bgcolor: 'white', position: 'absolute', right: 0 }} onClick={() => handleRemoveVideo(videoId)}>
                            <CloseIcon sx={{ fontSize: '1rem', color: 'red' }} />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}

                    {session.videos.length === 0 && (
                      <Grid item xs={12}>
                        <Button variant="contained" color="primary" size="large" sx={{ height: "55px" }} onClick={handleLoadSampleVideos}>Load sample videos</Button>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: '4rem', p: '2rem' }}>
              <Typography variant="h4" color="gray">
                Welcome to YouTube Watch Party!
              </Typography>

              <Typography variant="body1" component="p" >
                Choose or create a session to watch videos together.
              </Typography>
            </Box>

            <Box sx={{ py: '2rem' }}>
              {sessions.length > 0 ? (
                <>
                  <Typography variant="h4" sx={{ textAlign: 'center' }}>
                    Sessions Available right now
                  </Typography>

                  <Grid container spacing={3}>
                    {sessions.map(session => (
                      <Grid item xs={3} key={session.id}>
                        <Button variant="contained" color="secondary" size="large" sx={{
                          height: "55px",
                          width: "100%",
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }} onClick={() => handleJoinSession(session.id)}>
                          <YouTubeIcon fontSize="large" color="error" />

                          <Typography variant="h5">{session.name}</Typography>

                          <PlayCircleIcon fontSize="large" color="success" />
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ mb: '2rem' }}>
                    No sessions available right now
                  </Typography>

                  <Button variant="contained" color="primary" size="large" startIcon={<AddIcon />} sx={{ mr: '2rem' }}>
                    Create a session
                  </Button>

                  <Button variant="contained" color="primary" size="large" startIcon={<AddIcon />} onClick={handleLoadSampleSession}>
                    Load sample session
                  </Button>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* form dialog */}
      <Dialog open={!!dialogOpen} onClose={handleClose}>
        <DialogTitle>{dialogOpen}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit((data => {
            handleFormSubmission(data, dialogOpen)
          }))}>
            <TextField
              {...register('email', { required: "Your Email Is Required" })}
              placeholder="Enter Your Email"
              sx={{ mr: '1rem', width: '100%', mb: '1rem' }}
              type="email"
              error={!!errors.email}
              helperText={errors.email && errors.email.message}
            />

            <TextField
              {...register('password', { required: "Your Password Is Required" })}
              placeholder="Enter Your Password"
              type="password"
              sx={{ mr: '1rem', width: '100%', mb: '1rem' }}
              error={!!errors.password}
              helperText={errors.password && errors.password.message}
            />

            <Button variant="contained" color="primary" size="large" sx={{ height: "55px" }} type="submit" >
              {dialogOpen}
            </Button>
          </form>

          {authError && <Typography variant="body1" color="error" sx={{ mt: '1rem' }}>{authError}</Typography>}
        </DialogContent>
      </Dialog>
    </Box >
  )
}

export default App
