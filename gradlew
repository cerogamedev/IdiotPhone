#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
export JAVA_HOME="/Applications/Unity/Hub/Editor/2022.3.62f2/PlaybackEngines/AndroidPlayer/OpenJDK"
export ANDROID_HOME="/Applications/Unity/Hub/Editor/2022.3.62f2/PlaybackEngines/AndroidPlayer/SDK"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
exec "$JAVA_HOME/bin/java" -Dorg.gradle.appname=gradlew -classpath "/Applications/Unity/Hub/Editor/2022.3.62f2/PlaybackEngines/AndroidPlayer/Tools/gradle/lib/gradle-launcher-7.5.1.jar" org.gradle.launcher.GradleMain "$@"
