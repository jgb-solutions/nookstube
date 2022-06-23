import { useEffect, useState } from "react"
import { initializeApp } from "firebase/app"
import { getFirestore, addDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, onAuthStateChanged } from "firebase/auth"

import { PartySession } from "../types"


const firebaseConfig = {
  apiKey: "AIzaSyAQhW9a2zOGwOFwHqPvcSv3x0JZ1iqMwDM",
  authDomain: "nookstube.firebaseapp.com",
  projectId: "nookstube",
  storageBucket: "nookstube.appspot.com",
  messagingSenderId: "24688023973",
  appId: "1:24688023973:web:a868ae97c9e36cabfa704c"
}

// needs to be initialized first
const app = initializeApp(firebaseConfig)
// then those can be used
const auth = getAuth()
const db = getFirestore(app)

const SESSIONS = "sessions"

export const createAccount = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user

      return user
    })

}

export const login = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {

      const user = userCredential.user

      return user
    })

}

export const logout = async () => {
  signOut(auth).then(() => {
    // Sign-out successful.
  }).catch((error) => {
    // An error happened.
  })
}




export const addSession = async (sessionId: string) => {
  try {
    const docRef = await addDoc(collection(db, SESSIONS, sessionId), {

    })

    console.log("Document written with ID: ", docRef.id)
  } catch (e) {
    console.error("Error adding document: ", e)
  }
}

export const getSession = async (sessionId: string) => {
  const docRef = doc(db, SESSIONS, sessionId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data()
  } else {
    return null
  }
}

export const getAllSessions = async (): Promise<PartySession[]> => {
  const querySnapshot = await getDocs(collection(db, SESSIONS))

  const sessions: PartySession[] = []
  querySnapshot.docs.forEach(docRef => {
    const data = docRef.data() as Omit<PartySession, "id">

    sessions.push({ id: docRef.id, ...data })
  })

  return sessions
}

export const updateSession = async (sessionId: string, data: Partial<Omit<PartySession, "id">>) => {
  const washingtonRef = doc(db, SESSIONS, sessionId)

  await updateDoc(washingtonRef, {
    ...data,
  })
}

export const deleteSession = async (sessionId: string) => {
  await deleteDoc(doc(db, "cities", "DC"))
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser)
        // ...
      } else {
        // User is signed out
        setUser(null)
      }
    })
  }, [])

  return { user }
}

export const useSession = (sessionId?: string) => {
  const [realtimeSession, setRealtimeSession] = useState<PartySession>()
  const [sessionIdToWatch, setSessionIdToWatach] = useState(sessionId)

  useEffect(() => {
    if (sessionIdToWatch) {
      const unsub = onSnapshot(doc(db, SESSIONS, sessionIdToWatch), (doc) => {
        const source = doc.metadata.hasPendingWrites ? "Local" : "Server"
        console.log(source, " data: ", doc.data())

        setRealtimeSession({ id: doc.id, ...doc.data() as Omit<PartySession, "id"> })
      })

      return () => {
        unsub()
      }
    }
  }, [sessionIdToWatch])


  return { realtimeSession, setSessionIdToWatach }
}
