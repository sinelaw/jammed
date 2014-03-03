{-# LANGUAGE OverloadedStrings, TemplateHaskell, ScopedTypeVariables #-}
module Main where

import           Control.Applicative
import           Snap.Core
import           Snap.Util.FileServe
import           Snap.Http.Server
import           Data.Vect.Float.Base
import           Data.Vect.Float.Instances()
import           Data.Aeson
import           Data.Aeson.Types
import           Data.Aeson.TH (deriveJSON)
import           Data.Aeson.Encode.Pretty
--import           Data.ByteString.Lazy as BS
import           Data.Maybe (fromJust, fromMaybe)
import Data.ByteString as BS
import Data.ByteString.Lazy as LBS
import Control.Monad (join)

lazyToStrictBS :: LBS.ByteString -> BS.ByteString
lazyToStrictBS x = BS.concat $ LBS.toChunks x

strictToLazyBS :: BS.ByteString -> LBS.ByteString
strictToLazyBS x = LBS.fromChunks [x]

$(deriveJSON defaultOptions ''Vec2)

data Mass = Mass { size :: Float
                 , position :: Vec2 
                 , velocity :: Vec2 
                 , acceleration :: Vec2 
                 } 
            deriving (Show, Eq)

$(deriveJSON defaultOptions ''Mass)
                     
-- instance FromJSON Vec2                     
-- instance ToJSON Vec2
-- instance FromJSON Mass
-- instance ToJSON Mass
                     
--(deriveJSON defaultOptions{constructorTagModifier = map toLower} ''Mass)

main :: IO ()
-- main = do
--   let mass = Mass 0 zero zero zero
--       x = fromJSON (toJSON mass) == Success mass
--   --putStr . (++ "\n") $ if x then "yay" else "boo"
--   BS.putStr . encodePretty . toJSON $ mass
--   return ()
main = quickHttpServe site

site :: Snap ()
site =
    ifTop (writeBS "hello world") <|>
    route [ ("simulate/:mass", simulateHandler)
          ] <|>
    dir "static" (serveDirectory ".")

simulateHandler :: Snap ()
simulateHandler = do
    param <- getParam $ "mass"
    let paramVal :: Maybe Mass = join $ fmap (decode . strictToLazyBS) param
        exampleMass = lazyToStrictBS . encode $ Mass 0 zero zero zero
        errorMessage = BS.concat ["invalid mass: ", fromMaybe "" param
                                 , " valid example is", exampleMass] 
    maybe (writeBS errorMessage)
          (writeBS . lazyToStrictBS . encodePretty . toJSON) 
          paramVal
