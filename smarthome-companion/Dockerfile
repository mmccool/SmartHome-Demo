### Build the image from ubuntu 16.04 LTS
FROM ubuntu:16.04

### Allow to set-up HTTP(S) proxy using '--build-arg'
ARG http_proxy
ENV http_proxy ${http_proxy}
ARG https_proxy
ENV https_proxy ${https_proxy}
RUN echo 'http_proxy='$http_proxy'\nhttps_proxy='$https_proxy

### Clear local repository & install common tools
RUN apt-get clean \
 && apt-get update && apt-get install -y \
        git             \
        unzip           \
        wget

### Configuration settings & options
ENV WORKSPACE           /opt
ENV ANDROID_HOME        $WORKSPACE/android-sdk-linux
ENV IOTIVITY            $WORKSPACE/iotivity
ENV MOUNT               $WORKSPACE/mnt

### Install Android command line tools
ENV ANDROID_SDK_TOOLS sdk-tools-linux-3859397.zip
RUN wget https://dl.google.com/android/repository/$ANDROID_SDK_TOOLS \
 && unzip $ANDROID_SDK_TOOLS -d $ANDROID_HOME \
 && rm -f $ANDROID_SDK_TOOLS
ENV ANDROID_SDK_TOOLS ""

### Install the required packages with Android SDK manager
WORKDIR $ANDROID_HOME
RUN : === Android aapt requires 32-bit libraries installed \
 && apt-get update && apt-get install -y \
        default-jdk     \
        lib32stdc++6    \
        lib32z1         \
        maven           \
 && tools/bin/sdkmanager --update \
 && yes | tools/bin/sdkmanager --licenses \
 && : === 'Android API 21' and 'Android SDK Build Tools 20.0.0' required by IoTivity Android \
 && tools/bin/sdkmanager \
        "platforms;android-21" \
        "build-tools;20.0.0"

### Build IoTivity
WORKDIR $IOTIVITY
RUN : === install build dependencies \
          https://wiki.iotivity.org/build_iotivity_with_ubuntu_build_machine \
 && apt-get update && apt-get install -y \
        build-essential git scons libtool autoconf valgrind doxygen wget unzip \
        libboost-dev libboost-program-options-dev libboost-thread-dev \
        uuid-dev libexpat1-dev libglib2.0-dev libsqlite3-dev libcurl4-gnutls-dev \
 && : === checkout the source \
 && git clone https://gerrit.iotivity.org/gerrit/p/iotivity.git $IOTIVITY \
 && git checkout 1.3.1 \
 && : === pull the tinycbor and mbedtls projects before building IoTivity \
 && git clone https://github.com/01org/tinycbor.git extlibs/tinycbor/tinycbor -b v0.4.1 \
 && git clone https://github.com/ARMmbed/mbedtls.git extlibs/mbedtls/mbedtls -b mbedtls-2.4.2 \
 && : === build targets \
 && scons TARGET_OS=linux resource/csdk/security/tool \
 && scons TARGET_OS=android ANDROID_HOME=$ANDROID_HOME TARGET_ARCH=armeabi java \
 && scons TARGET_OS=android ANDROID_HOME=$ANDROID_HOME TARGET_ARCH=x86     java \
 && : === install the libraries to local maven repository \
 && mvn install:install-file -Dfile=$IOTIVITY/java/iotivity-android/build/outputs/aar/iotivity-base-x86-release.aar \
                             -DgroupId=org.iotivity -DartifactId=base -Dversion=1.3.1-secured -Dpackaging=aar
ENV PATH $PATH:$IOTIVITY/out/linux/x86_64/release/resource/csdk/security/tool

### Unset variables
ENV http_proxy ""
ENV https_proxy ""

# Build the Android app
VOLUME $MOUNT
WORKDIR $MOUNT
ENTRYPOINT [ -f $MOUNT/gradlew ] \
        && echo 'sdk.dir='$ANDROID_HOME > local.properties \
        && ./gradlew assembleDebug \
        || echo 'Gradle Wrapper not available in ' $MOUNT
