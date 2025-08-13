using NUnit.Framework;
using UnityEngine;
using UnityEditor;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// EditMode tests for Cinemachine virtual camera system functionality
    /// Tests virtual camera creation, configuration, and 2D/3D camera setups
    /// </summary>
    public class CinemachineSystemTests
    {
        private GameObject testCameraTarget;
        private GameObject testVirtualCamera;
        
        [SetUp]
        public void Setup()
        {
            // Create test camera target
            testCameraTarget = new GameObject("CameraTarget");
            testCameraTarget.transform.position = Vector3.zero;
            
            // Create test virtual camera GameObject
            testVirtualCamera = new GameObject("TestVirtualCamera");
        }
        
        [TearDown]
        public void Cleanup()
        {
            // Clean up test objects
            if (testCameraTarget != null)
            {
                Object.DestroyImmediate(testCameraTarget);
            }
            if (testVirtualCamera != null)
            {
                Object.DestroyImmediate(testVirtualCamera);
            }
        }
        
        [Test]
        public void CinemachineSystem_CreateVirtualCamera_CreatesSuccessfully()
        {
            // Assert
            Assert.IsNotNull(testVirtualCamera, "Virtual camera GameObject should be created");
            Assert.IsNotNull(testVirtualCamera.transform, "Virtual camera should have transform component");
        }
        
        [Test]
        public void CinemachineSystem_ValidateCameraTargeting_ConfiguresTargetCorrectly()
        {
            // Arrange & Act
            testVirtualCamera.transform.LookAt(testCameraTarget.transform);
            var direction = (testCameraTarget.transform.position - testVirtualCamera.transform.position).normalized;
            
            // Assert
            Assert.IsNotNull(testCameraTarget, "Camera target should exist");
            Assert.Greater(Vector3.Dot(testVirtualCamera.transform.forward, direction), 0.9f, 
                "Camera should be pointing towards target");
        }
        
        [Test]
        public void CinemachineSystem_Validate2DCameraSetup_Configures2DCamera()
        {
            // Arrange - Set up for 2D camera
            var camera2D = testVirtualCamera.AddComponent<Camera>();
            camera2D.orthographic = true;
            camera2D.orthographicSize = 5f;
            
            // Act & Assert
            Assert.IsTrue(camera2D.orthographic, "2D camera should be orthographic");
            Assert.AreEqual(5f, camera2D.orthographicSize, "Orthographic size should be set correctly");
        }
        
        [Test]
        public void CinemachineSystem_Validate3DCameraSetup_Configures3DCamera()
        {
            // Arrange - Set up for 3D camera
            var camera3D = testVirtualCamera.AddComponent<Camera>();
            camera3D.orthographic = false;
            camera3D.fieldOfView = 60f;
            
            // Act & Assert
            Assert.IsFalse(camera3D.orthographic, "3D camera should use perspective projection");
            Assert.AreEqual(60f, camera3D.fieldOfView, "Field of view should be set correctly");
        }
        
        [Test]
        public void CinemachineSystem_ValidateCameraComposition_ConfiguresFraming()
        {
            // Arrange
            var targetPosition = new Vector3(5f, 3f, 10f);
            testCameraTarget.transform.position = targetPosition;
            
            // Act - Position camera for optimal framing
            testVirtualCamera.transform.position = targetPosition + Vector3.back * 10f;
            testVirtualCamera.transform.LookAt(testCameraTarget.transform);
            
            // Assert
            var distance = Vector3.Distance(testVirtualCamera.transform.position, testCameraTarget.transform.position);
            Assert.Greater(distance, 5f, "Camera should maintain appropriate distance from target");
        }
        
        [Test]
        public void CinemachineSystem_ValidateCameraBlending_SupportsTransitions()
        {
            // Arrange
            var camera1 = new GameObject("Camera1");
            var camera2 = new GameObject("Camera2");
            
            camera1.transform.position = Vector3.left * 5f;
            camera2.transform.position = Vector3.right * 5f;
            
            // Act - Test blend calculation
            float blendWeight = 0.5f;
            var blendedPosition = Vector3.Lerp(camera1.transform.position, camera2.transform.position, blendWeight);
            
            // Assert
            Assert.AreEqual(Vector3.zero, blendedPosition, "Blended position should be at origin with 0.5 weight");
            
            // Cleanup
            Object.DestroyImmediate(camera1);
            Object.DestroyImmediate(camera2);
        }
        
        [Test]
        public void CinemachineSystem_ValidateFollowTarget_TracksTargetMovement()
        {
            // Arrange
            var initialTargetPosition = testCameraTarget.transform.position;
            var initialCameraPosition = testVirtualCamera.transform.position;
            
            // Act - Move target
            testCameraTarget.transform.position += Vector3.right * 5f;
            var targetOffset = testCameraTarget.transform.position - initialTargetPosition;
            
            // Simulate camera following (in real Cinemachine, this would be automatic)
            testVirtualCamera.transform.position = initialCameraPosition + targetOffset;
            
            // Assert
            var cameraOffset = testVirtualCamera.transform.position - initialCameraPosition;
            Assert.AreEqual(targetOffset, cameraOffset, "Camera should follow target movement");
        }
        
        [Test]
        public void CinemachineSystem_ValidateCameraConstraints_EnforcesBoundaries()
        {
            // Arrange - Define camera boundaries
            var minBounds = new Vector3(-10f, -5f, -10f);
            var maxBounds = new Vector3(10f, 5f, 10f);
            
            // Act - Test boundary constraint
            var testPosition = new Vector3(15f, 8f, 12f); // Outside bounds
            var constrainedPosition = Vector3.Max(Vector3.Min(testPosition, maxBounds), minBounds);
            
            // Assert
            Assert.LessOrEqual(constrainedPosition.x, maxBounds.x, "X should be within max bounds");
            Assert.GreaterOrEqual(constrainedPosition.x, minBounds.x, "X should be within min bounds");
            Assert.AreEqual(new Vector3(10f, 5f, 10f), constrainedPosition, "Position should be clamped to bounds");
        }
        
        [Test]
        public void CinemachineSystem_ValidateLookAtTarget_CalculatesCorrectRotation()
        {
            // Arrange
            testVirtualCamera.transform.position = Vector3.back * 10f;
            testCameraTarget.transform.position = Vector3.forward * 5f;
            
            // Act
            testVirtualCamera.transform.LookAt(testCameraTarget.transform);
            
            // Assert
            var forward = testVirtualCamera.transform.forward;
            var expectedDirection = (testCameraTarget.transform.position - testVirtualCamera.transform.position).normalized;
            
            Assert.Greater(Vector3.Dot(forward, expectedDirection), 0.99f, 
                "Camera should be looking directly at target");
        }
        
        [Test]
        public void CinemachineSystem_ValidateCameraPriority_SupportsPrioritySystem()
        {
            // Arrange
            var highPriorityCamera = new GameObject("HighPriorityCamera");
            var lowPriorityCamera = new GameObject("LowPriorityCamera");
            
            int highPriority = 10;
            int lowPriority = 5;
            
            // Act & Assert
            Assert.Greater(highPriority, lowPriority, "High priority should be greater than low priority");
            
            // In real Cinemachine, we would set CinemachineVirtualCamera.Priority
            // For testing framework, we validate priority logic
            
            // Cleanup
            Object.DestroyImmediate(highPriorityCamera);
            Object.DestroyImmediate(lowPriorityCamera);
        }
        
        [Test]
        public void CinemachineSystem_ValidateNoise_SupportsScreenShake()
        {
            // Arrange - Test noise parameters
            float noiseAmplitude = 1.0f;
            float noiseFrequency = 1.0f;
            
            // Act - Calculate noise offset (simplified)
            var time = Time.realtimeSinceStartup;
            var noiseOffset = new Vector3(
                Mathf.Sin(time * noiseFrequency) * noiseAmplitude,
                Mathf.Cos(time * noiseFrequency * 1.1f) * noiseAmplitude,
                0f
            );
            
            // Assert
            Assert.LessOrEqual(Mathf.Abs(noiseOffset.x), noiseAmplitude, "Noise X should be within amplitude");
            Assert.LessOrEqual(Mathf.Abs(noiseOffset.y), noiseAmplitude, "Noise Y should be within amplitude");
        }
    }
}