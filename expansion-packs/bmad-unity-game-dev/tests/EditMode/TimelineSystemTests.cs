using NUnit.Framework;
using UnityEngine;
using UnityEngine.Timeline;
using UnityEngine.Playables;
using UnityEditor;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// EditMode tests for Unity Timeline System functionality
    /// Tests timeline asset creation, playable track configuration, and integration
    /// </summary>
    public class TimelineSystemTests
    {
        private TimelineAsset testTimeline;
        private GameObject testDirector;
        private PlayableDirector playableDirector;
        
        [SetUp]
        public void Setup()
        {
            // Create test timeline asset
            testTimeline = ScriptableObject.CreateInstance<TimelineAsset>();
            
            // Create test director GameObject
            testDirector = new GameObject("TestDirector");
            playableDirector = testDirector.AddComponent<PlayableDirector>();
            playableDirector.playableAsset = testTimeline;
        }
        
        [TearDown]
        public void Cleanup()
        {
            // Clean up test objects
            if (testTimeline != null)
            {
                Object.DestroyImmediate(testTimeline);
            }
            if (testDirector != null)
            {
                Object.DestroyImmediate(testDirector);
            }
        }
        
        [Test]
        public void TimelineSystem_CreateTimelineAsset_CreatesSuccessfully()
        {
            // Assert
            Assert.IsNotNull(testTimeline, "Timeline asset should be created successfully");
            Assert.IsInstanceOf<TimelineAsset>(testTimeline, "Should be a valid TimelineAsset");
        }
        
        [Test]
        public void TimelineSystem_AddAnimationTrack_AddsTrackCorrectly()
        {
            // Act
            var animationTrack = testTimeline.CreateTrack<AnimationTrack>(null, "TestAnimationTrack");
            
            // Assert
            Assert.IsNotNull(animationTrack, "Animation track should be created");
            Assert.AreEqual("TestAnimationTrack", animationTrack.name, "Track should have correct name");
            Assert.AreEqual(1, testTimeline.GetOutputTracks().Count(), "Timeline should contain one track");
        }
        
        [Test]
        public void TimelineSystem_AddActivationTrack_AddsTrackCorrectly()
        {
            // Act
            var activationTrack = testTimeline.CreateTrack<ActivationTrack>(null, "TestActivationTrack");
            
            // Assert
            Assert.IsNotNull(activationTrack, "Activation track should be created");
            Assert.AreEqual("TestActivationTrack", activationTrack.name, "Track should have correct name");
        }
        
        [Test]
        public void TimelineSystem_SetTimelineDuration_UpdatesDurationCorrectly()
        {
            // Arrange
            const double expectedDuration = 10.0;
            
            // Act
            testTimeline.fixedDuration = expectedDuration;
            
            // Assert
            Assert.AreEqual(expectedDuration, testTimeline.fixedDuration, "Timeline duration should be set correctly");
        }
        
        [Test]
        public void TimelineSystem_PlayableDirectorConfiguration_ConfiguresCorrectly()
        {
            // Assert
            Assert.IsNotNull(playableDirector, "PlayableDirector should be created");
            Assert.AreEqual(testTimeline, playableDirector.playableAsset, "Director should reference timeline asset");
            Assert.AreEqual(DirectorWrapMode.Hold, playableDirector.extrapolationMode, "Default wrap mode should be Hold");
        }
        
        [Test]
        public void TimelineSystem_AddSignalTrack_AddsSignalTrackCorrectly()
        {
            // Act
            var signalTrack = testTimeline.CreateTrack<SignalTrack>(null, "TestSignalTrack");
            
            // Assert
            Assert.IsNotNull(signalTrack, "Signal track should be created");
            Assert.IsInstanceOf<SignalTrack>(signalTrack, "Should be a valid SignalTrack");
        }
        
        [Test]
        public void TimelineSystem_ValidateTimelineFrameRate_HasCorrectFrameRate()
        {
            // Act
            var frameRate = testTimeline.editorSettings.frameRate;
            
            // Assert
            Assert.Greater(frameRate, 0, "Frame rate should be positive");
            // Default frame rate is typically 60 FPS
            Assert.AreEqual(60, frameRate, "Default frame rate should be 60 FPS");
        }
        
        [Test]
        public void TimelineSystem_CreateTrackGroup_GroupsTracksCorrectly()
        {
            // Act
            var trackGroup = testTimeline.CreateTrack<GroupTrack>(null, "TestGroup");
            var childTrack = testTimeline.CreateTrack<AnimationTrack>(trackGroup, "ChildTrack");
            
            // Assert
            Assert.IsNotNull(trackGroup, "Track group should be created");
            Assert.IsNotNull(childTrack, "Child track should be created");
            Assert.AreEqual(trackGroup, childTrack.parent, "Child track should have correct parent");
        }
        
        [Test]
        public void TimelineSystem_ValidateTimelineOutputs_ConfiguresOutputsCorrectly()
        {
            // Arrange
            var animationTrack = testTimeline.CreateTrack<AnimationTrack>(null, "TestTrack");
            var targetGameObject = new GameObject("AnimationTarget");
            var animator = targetGameObject.AddComponent<Animator>();
            
            // Act
            playableDirector.SetGenericBinding(animationTrack, animator);
            var binding = playableDirector.GetGenericBinding(animationTrack);
            
            // Assert
            Assert.AreEqual(animator, binding, "Track binding should be set correctly");
            
            // Cleanup
            Object.DestroyImmediate(targetGameObject);
        }
        
        [Test]
        public void TimelineSystem_ValidateTimelineAssetEditorSettings_HasCorrectSettings()
        {
            // Act & Assert
            Assert.IsNotNull(testTimeline.editorSettings, "Timeline should have editor settings");
            Assert.IsTrue(testTimeline.editorSettings.frameRate > 0, "Frame rate should be positive");
            Assert.IsNotNull(testTimeline.editorSettings, "Editor settings should be accessible");
        }
        
        [Test]
        public void TimelineSystem_CreateMultipleTracks_MaintainsTrackOrder()
        {
            // Act
            var track1 = testTimeline.CreateTrack<AnimationTrack>(null, "Track1");
            var track2 = testTimeline.CreateTrack<ActivationTrack>(null, "Track2");
            var track3 = testTimeline.CreateTrack<AnimationTrack>(null, "Track3");
            
            var tracks = testTimeline.GetOutputTracks().ToArray();
            
            // Assert
            Assert.AreEqual(3, tracks.Length, "Should have three tracks");
            Assert.AreEqual("Track1", tracks[0].name, "First track should be Track1");
            Assert.AreEqual("Track2", tracks[1].name, "Second track should be Track2");
            Assert.AreEqual("Track3", tracks[2].name, "Third track should be Track3");
        }
        
        [Test]
        public void TimelineSystem_ValidateTimelinePlayback_SupportsPlaybackControl()
        {
            // Act & Assert
            Assert.AreEqual(PlayState.Paused, playableDirector.state, "Initial state should be Paused");
            Assert.AreEqual(0.0, playableDirector.time, "Initial time should be 0");
            
            // Test time setting
            playableDirector.time = 5.0;
            Assert.AreEqual(5.0, playableDirector.time, "Time should be settable");
        }
    }
}